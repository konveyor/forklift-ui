import { MutationResultPair, useQueryCache, QueryResult, QueryStatus } from 'react-query';
import * as yup from 'yup';
import {
  IVMwareProvider,
  IOpenShiftProvider,
  MappingType,
  MappingSource,
  MappingTarget,
  Mapping,
  POD_NETWORK,
} from './types';
import { useStorageClassesQuery } from './storageClasses';
import {
  getAggregateQueryStatus,
  getFirstQueryError,
  mockKubeList,
  sortKubeResultsByName,
  useMockableMutation,
  useMockableQuery,
} from './helpers';
import { useOpenShiftNetworksQuery, useVMwareNetworksQuery } from './networks';
import { useDatastoresQuery } from './datastores';
import { checkIfResourceExists, ForkliftResource, ForkliftResourceKind } from '@app/client/helpers';
import { dnsLabelNameSchema, META } from '@app/common/constants';
import { KubeClientError, IKubeList, IKubeResponse, IKubeStatus } from '@app/client/types';
import { MOCK_NETWORK_MAPPINGS, MOCK_STORAGE_MAPPINGS } from './mocks/mappings.mock';
import { usePollingContext } from '@app/common/context';
import { useAuthorizedK8sClient } from './fetchHelpers';
import { findProvidersByRefs, useInventoryProvidersQuery } from './providers';

const getMappingResource = (mappingType: MappingType) => {
  const kind =
    mappingType === MappingType.Network
      ? ForkliftResourceKind.NetworkMap
      : ForkliftResourceKind.StorageMap;
  const resource = new ForkliftResource(kind, META.namespace);
  return { kind, resource };
};

export const useMappingsQuery = (mappingType: MappingType): QueryResult<IKubeList<Mapping>> => {
  const client = useAuthorizedK8sClient();
  const result = useMockableQuery<IKubeList<Mapping>>(
    {
      queryKey: ['mappings', mappingType],
      queryFn: async () =>
        (await client.list<IKubeList<Mapping>>(getMappingResource(mappingType).resource)).data,
      config: { refetchInterval: usePollingContext().refetchInterval },
    },
    mappingType === MappingType.Network
      ? mockKubeList(MOCK_NETWORK_MAPPINGS, 'NetworkMapList')
      : mockKubeList(MOCK_STORAGE_MAPPINGS, 'StorageMapList')
  );
  return sortKubeResultsByName(result);
};

export const useCreateMappingMutation = (
  mappingType: MappingType,
  onSuccess?: () => void
): MutationResultPair<
  IKubeResponse<Mapping>,
  KubeClientError,
  Mapping,
  unknown // TODO replace `unknown` for TSnapshot? not even sure what this is for
> => {
  const client = useAuthorizedK8sClient();
  const queryCache = useQueryCache();
  return useMockableMutation<IKubeResponse<Mapping>, KubeClientError, Mapping>(
    async (mapping: Mapping) => {
      const { kind, resource } = getMappingResource(mappingType);
      await checkIfResourceExists(client, kind, resource, mapping.metadata.name);
      return await client.create<Mapping>(resource, mapping);
    },
    {
      onSuccess: () => {
        queryCache.invalidateQueries(['mappings', mappingType]);
        onSuccess && onSuccess();
      },
    }
  );
};

export const usePatchMappingMutation = (
  mappingType: MappingType,
  onSuccess?: () => void
): MutationResultPair<IKubeResponse<Mapping>, KubeClientError, Mapping, unknown> => {
  const client = useAuthorizedK8sClient();
  const queryCache = useQueryCache();
  return useMockableMutation<IKubeResponse<Mapping>, KubeClientError, Mapping>(
    async (mapping: Mapping) => {
      const { resource } = getMappingResource(mappingType);
      return await client.patch(resource, mapping.metadata.name, mapping);
    },
    {
      onSuccess: () => {
        queryCache.invalidateQueries(['mappings', mappingType]);
        onSuccess && onSuccess();
      },
    }
  );
};

export const useDeleteMappingMutation = (
  mappingType: MappingType,
  onSuccess?: () => void
): MutationResultPair<IKubeResponse<IKubeStatus>, KubeClientError, Mapping, unknown> => {
  const client = useAuthorizedK8sClient();
  const { resource } = getMappingResource(mappingType);
  const queryCache = useQueryCache();
  return useMockableMutation<IKubeResponse<IKubeStatus>, KubeClientError, Mapping>(
    (mapping: Mapping) => client.delete(resource, mapping.metadata.name),
    {
      onSuccess: () => {
        queryCache.invalidateQueries(['mappings', mappingType]);
        onSuccess && onSuccess();
      },
    }
  );
};

export interface IMappingResourcesResult {
  availableSources: MappingSource[];
  availableTargets: MappingTarget[];
  isLoading: boolean;
  isError: boolean;
  status: QueryStatus;
  error: unknown; // TODO not sure how to handle error types yet
  queries: QueryResult<unknown>[];
}

export interface ISpecificMappingResourcesResult extends IMappingResourcesResult {
  sourceProvider: IVMwareProvider | null;
  targetProvider: IOpenShiftProvider | null;
}

export const useMappingResourceQueries = (
  sourceProvider: IVMwareProvider | null,
  targetProvider: IOpenShiftProvider | null,
  mappingType: MappingType
): IMappingResourcesResult => {
  const vmwareNetworksQuery = useVMwareNetworksQuery(sourceProvider, mappingType);
  const datastoresQuery = useDatastoresQuery(sourceProvider, mappingType);
  const openshiftNetworksQuery = useOpenShiftNetworksQuery(targetProvider, mappingType);
  const storageClassesQuery = useStorageClassesQuery(
    targetProvider ? [targetProvider] : null,
    mappingType
  );

  let availableSources: MappingSource[] = [];
  let availableTargets: MappingTarget[] = [];
  if (mappingType === MappingType.Network) {
    availableSources = (sourceProvider && vmwareNetworksQuery.data) || [];
    availableTargets =
      targetProvider && openshiftNetworksQuery.data
        ? [POD_NETWORK, ...openshiftNetworksQuery.data]
        : [];
  }
  if (mappingType === MappingType.Storage) {
    availableSources = (sourceProvider && datastoresQuery.data) || [];
    availableTargets =
      (targetProvider &&
        storageClassesQuery.data &&
        storageClassesQuery.data[targetProvider.name]) ||
      [];
  }

  const queriesToWatch =
    mappingType === MappingType.Network
      ? [vmwareNetworksQuery, openshiftNetworksQuery]
      : [datastoresQuery, storageClassesQuery];
  const status = getAggregateQueryStatus(queriesToWatch);
  const error = getFirstQueryError(queriesToWatch);

  return {
    availableSources,
    availableTargets,
    isLoading: status === QueryStatus.Loading,
    isError: status === QueryStatus.Error,
    status,
    error,
    queries: queriesToWatch,
  };
};

export const useResourceQueriesForMapping = (
  mappingType: MappingType,
  mapping: Mapping | null
): ISpecificMappingResourcesResult => {
  const providersQuery = useInventoryProvidersQuery();
  const { sourceProvider, targetProvider } = findProvidersByRefs(
    mapping?.spec.provider || null,
    providersQuery
  );
  const mappingResourceQueries = useMappingResourceQueries(
    sourceProvider,
    targetProvider,
    mappingType
  );
  const allQueries = [providersQuery, ...mappingResourceQueries.queries];
  const status = getAggregateQueryStatus(allQueries);
  const error = getFirstQueryError(allQueries);
  return {
    ...mappingResourceQueries,
    queries: allQueries,
    isLoading: status === QueryStatus.Loading,
    isError: status === QueryStatus.Error,
    status,
    error,
    sourceProvider,
    targetProvider,
  };
};

export const getMappingNameSchema = (
  mappingsQuery: QueryResult<IKubeList<Mapping>>,
  mappingBeingEdited: Mapping | null
): yup.StringSchema =>
  dnsLabelNameSchema.test('unique-name', 'A mapping with this name already exists', (value) => {
    if (mappingBeingEdited?.metadata.name === value) return true;
    if (mappingsQuery.data?.items.find((mapping) => mapping.metadata.name === value)) return false;
    return true;
  });

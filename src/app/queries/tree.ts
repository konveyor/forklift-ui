import * as React from 'react';
import { usePollingContext } from '@app/common/context';
import { QueryResult } from 'react-query';
import { getInventoryApiUrl, sortTreeItemsByName, useMockableQuery } from './helpers';
import { MOCK_VMWARE_HOST_TREE, MOCK_VMWARE_VM_TREE } from './mocks/tree.mock';
import { IVMwareProvider } from './types';
import { VMwareTree, VMwareTreeType } from './types/tree.types';
import { useAuthorizedFetch } from './fetchHelpers';

// TODO add support for RHV VM trees, limit host trees to vmware only
export const useVMwareTreeQuery = <T extends VMwareTree>(
  provider: IVMwareProvider | null,
  treeType: VMwareTreeType
): QueryResult<T> => {
  const apiSlug = treeType === VMwareTreeType.Host ? '/tree/host' : '/tree/vm';
  const result = useMockableQuery<T>(
    {
      queryKey: ['vmware-tree', provider?.name, treeType],
      queryFn: useAuthorizedFetch(getInventoryApiUrl(`${provider?.selfLink || ''}${apiSlug}`)),
      config: {
        enabled: !!provider,
        refetchInterval: usePollingContext().refetchInterval,
      },
    },
    (treeType === VMwareTreeType.Host ? MOCK_VMWARE_HOST_TREE : MOCK_VMWARE_VM_TREE) as T
  );
  const sortedData = React.useMemo(() => sortTreeItemsByName(result.data), [result.data]);
  return {
    ...result,
    data: sortedData,
  };
};

import * as React from 'react';
import { Pagination, Level, LevelItem, Button } from '@patternfly/react-core';
import {
  Table,
  TableHeader,
  TableBody,
  sortable,
  compoundExpand,
  classNames as classNamesTransform,
  ICell,
  IRow,
} from '@patternfly/react-table';
import { DatabaseIcon, NetworkIcon } from '@patternfly/react-icons';
import tableStyles from '@patternfly/react-styles/css/components/Table/table';
import { useSortState, usePaginationState } from '@app/common/hooks';
import { useOCPMigrationNetworkMutation, useStorageClassesQuery } from '@app/queries';
import { ICorrelatedProvider, IOpenShiftProvider } from '@app/queries/types/providers.types';
import ProviderActionsDropdown from '../ProviderActionsDropdown';
import StatusCondition from '@app/common/components/StatusCondition';
import { MappingType } from '@app/queries/types';
import { getMostSeriousCondition, hasCondition, numStr } from '@app/common/helpers';

import './OpenShiftProvidersTable.css';
import { PlanStatusType, ProviderType } from '@app/common/constants';
import { isSameResource } from '@app/queries/helpers';
import OpenShiftNetworkList from './OpenShiftNetworkList';
import SelectOpenShiftNetworkModal from '@app/common/components/SelectOpenShiftNetworkModal';
import OpenShiftStorageClassList from './OpenShiftStorageClassList';

interface IOpenShiftProvidersTableProps {
  providers: ICorrelatedProvider<IOpenShiftProvider>[];
}

interface IExpandedItem {
  provider: ICorrelatedProvider<IOpenShiftProvider>;
  column: 'Networks' | 'Storage classes';
}

const OpenShiftProvidersTable: React.FunctionComponent<IOpenShiftProvidersTableProps> = ({
  providers,
}: IOpenShiftProvidersTableProps) => {
  const storageClassesQuery = useStorageClassesQuery(
    providers.map((provider) => provider.inventory),
    MappingType.Storage
  );
  const getStorageClasses = (provider: ICorrelatedProvider<IOpenShiftProvider>) =>
    (storageClassesQuery.data && storageClassesQuery.data[provider.metadata.name]) || [];

  const columns: ICell[] = [
    { title: 'Name', transforms: [sortable] },
    { title: 'Endpoint', transforms: [sortable] },
    { title: 'VMs', transforms: [sortable] },
    { title: 'Networks', transforms: [sortable], cellTransforms: [compoundExpand] },
    { title: 'Storage classes', transforms: [sortable], cellTransforms: [compoundExpand] },
    { title: 'Status', transforms: [sortable] },
    { title: '', columnTransforms: [classNamesTransform(tableStyles.tableAction)] },
  ];

  const getSortValues = (provider: ICorrelatedProvider<IOpenShiftProvider>) => {
    const { vmCount, networkCount } = provider.inventory || {};
    const storageClasses = getStorageClasses(provider);
    return [
      '', // Radio button column
      provider.metadata.name,
      provider.spec.url || '',
      numStr(vmCount),
      numStr(networkCount),
      numStr(storageClasses.length),
      provider.status ? getMostSeriousCondition(provider.status?.conditions) : '',
      '',
    ];
  };

  const { sortBy, onSort, sortedItems } = useSortState(providers, getSortValues);
  const { currentPageItems, setPageNumber, paginationProps } = usePaginationState(sortedItems, 10);
  React.useEffect(() => setPageNumber(1), [sortBy, setPageNumber]);

  const [expandedItem, setExpandedItem] = React.useState<IExpandedItem | null>(null);

  const [
    selectedProvider,
    setSelectedProvider,
  ] = React.useState<ICorrelatedProvider<IOpenShiftProvider> | null>(null);

  const rows: IRow[] = [];
  currentPageItems.forEach((provider: ICorrelatedProvider<IOpenShiftProvider>) => {
    const { vmCount, networkCount } = provider.inventory || {};
    const isExpanded = isSameResource(expandedItem?.provider.metadata, provider.metadata);
    const storageClasses = getStorageClasses(provider);
    rows.push({
      meta: { provider },
      isOpen: isExpanded,
      selected: isSameResource(selectedProvider?.metadata, provider.metadata),
      disableSelection: !hasCondition(provider.status?.conditions || [], PlanStatusType.Ready),
      cells: [
        provider.metadata.name,
        provider.spec.url,
        numStr(vmCount),
        {
          title: (
            <>
              <NetworkIcon key="networks-icon" /> {numStr(networkCount)}
            </>
          ),
          props: {
            isOpen: isExpanded && expandedItem?.column === 'Networks',
          },
        },
        {
          title: (
            <>
              <DatabaseIcon key="storage-classes-icon" /> {storageClasses.length}
            </>
          ),
          props: {
            isOpen: isExpanded && expandedItem?.column === 'Storage classes',
          },
        },
        {
          title: <StatusCondition status={provider.status} />,
        },
        {
          title: (
            <ProviderActionsDropdown provider={provider} providerType={ProviderType.openshift} />
          ),
        },
      ],
    });
    if (isExpanded) {
      rows.push({
        parent: rows.length - 1,
        compoundExpand: columns.findIndex((column) => column.title === expandedItem?.column) + 1,
        fullWidth: true,
        cells: [
          {
            title:
              expandedItem?.column === 'Networks' ? (
                <OpenShiftNetworkList provider={provider} />
              ) : (
                <OpenShiftStorageClassList provider={provider} storageClasses={storageClasses} />
              ),
            props: { colSpan: columns.length + 1, className: tableStyles.modifiers.noPadding },
          },
        ],
      });
    }
  });

  const [isSelectNetworkModalOpen, toggleSelectNetworkModal] = React.useReducer(
    (isOpen) => !isOpen,
    false
  );
  const [setMigrationNetwork, migrationNetworkMutationResult] = useOCPMigrationNetworkMutation(
    () => {
      toggleSelectNetworkModal();
      setExpandedItem({
        provider: selectedProvider as ICorrelatedProvider<IOpenShiftProvider>,
        column: 'Networks',
      });
      setSelectedProvider(null);
    }
  );

  const selectedNetworkName =
    (selectedProvider?.metadata.annotations &&
      selectedProvider?.metadata.annotations['forklift.konveyor.io/defaultTransferNetwork']) ||
    null;

  return (
    <>
      <Level>
        <LevelItem>
          <Button
            variant="secondary"
            onClick={toggleSelectNetworkModal}
            isDisabled={!selectedProvider}
          >
            Select migration network
          </Button>
        </LevelItem>
        <LevelItem>
          <Pagination {...paginationProps} widgetId="providers-table-pagination-top" />
        </LevelItem>
      </Level>
      <Table
        aria-label="OpenShift Virtualization providers table"
        cells={columns}
        rows={rows}
        sortBy={sortBy}
        onSort={onSort}
        onExpand={(_event, _rowIndex, colIndex, isOpen, rowData) => {
          setExpandedItem(
            !isOpen
              ? {
                  provider: rowData.meta.provider,
                  column: columns[colIndex - 1].title as IExpandedItem['column'],
                }
              : null
          );
        }}
        onSelect={(_event, _isSelected, _rowIndex, rowData) => {
          setSelectedProvider(rowData.meta.provider);
        }}
        selectVariant="radio"
      >
        <TableHeader />
        <TableBody />
      </Table>
      <Pagination
        {...paginationProps}
        widgetId="providers-table-pagination-bottom"
        variant="bottom"
      />
      {isSelectNetworkModalOpen ? (
        <SelectOpenShiftNetworkModal
          key={selectedNetworkName}
          targetProvider={selectedProvider?.inventory || null}
          targetNamespace={null}
          initialSelectedNetwork={selectedNetworkName}
          instructions="Select a default migration network for the provider. This network will be used for migrating data to all namespaces to which it is attached."
          onClose={() => {
            toggleSelectNetworkModal();
            migrationNetworkMutationResult.reset();
            setSelectedProvider(null);
          }}
          onSubmit={(network) =>
            setMigrationNetwork({ provider: selectedProvider?.inventory || null, network })
          }
          mutationResult={migrationNetworkMutationResult}
        />
      ) : null}
    </>
  );
};

export default OpenShiftProvidersTable;

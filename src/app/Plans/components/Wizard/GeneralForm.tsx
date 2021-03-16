import * as React from 'react';
import {
  Form,
  FormGroup,
  Select,
  SelectGroup,
  SelectOption,
  TextArea,
  TextContent,
  Text,
  Title,
  Button,
  Popover,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { getFormGroupProps, ValidatedTextInput } from '@konveyor/lib-ui';

import { IPlan, POD_NETWORK } from '@app/queries/types';
import { useClusterProvidersQuery, useInventoryProvidersQuery } from '@app/queries';
import { PlanWizardFormState } from './PlanWizard';
import { useNamespacesQuery } from '@app/queries/namespaces';
import { QuerySpinnerMode, ResolvedQueries } from '@app/common/components/ResolvedQuery';
import ProviderSelect from '@app/common/components/ProviderSelect';
import { ProviderType } from '@app/common/constants';
import { usePausedPollingEffect } from '@app/common/context';
import SelectOpenShiftNetworkModal from '@app/common/components/SelectOpenShiftNetworkModal';
import { HelpIcon } from '@patternfly/react-icons';
import { useOpenShiftNetworksQuery } from '@app/queries/networks';

interface IGeneralFormProps {
  form: PlanWizardFormState['general'];
  planBeingEdited: IPlan | null;
}

const GeneralForm: React.FunctionComponent<IGeneralFormProps> = ({
  form,
  planBeingEdited,
}: IGeneralFormProps) => {
  usePausedPollingEffect();

  const inventoryProvidersQuery = useInventoryProvidersQuery();
  const clusterProvidersQuery = useClusterProvidersQuery();
  const namespacesQuery = useNamespacesQuery(form.values.targetProvider);

  const [isNamespaceSelectOpen, setIsNamespaceSelectOpen] = React.useState(false);

  const getFilteredOptions = (searchText?: string) => {
    const namespaceOptions = namespacesQuery.data?.map((namespace) => namespace.name) || [];
    const filteredNamespaces = !searchText
      ? namespaceOptions
      : namespaceOptions.filter((option) => !!option.toLowerCase().match(searchText.toLowerCase()));
    return [
      <SelectGroup key="group" label="Select or type to create a namespace">
        {filteredNamespaces.map((option) => (
          <SelectOption key={option.toString()} value={option} />
        ))}
      </SelectGroup>,
    ];
  };

  const [isSelectNetworkModalOpen, toggleSelectNetworkModal] = React.useReducer(
    (isOpen) => !isOpen,
    false
  );

  const openshiftNetworksQuery = useOpenShiftNetworksQuery(form.values.targetProvider);

  const onTargetNamespaceChange = (targetNamespace: string) => {
    if (targetNamespace !== form.values.targetNamespace) {
      const providerDefaultNetworkName =
        form.values.targetProvider?.object.metadata.annotations?.[
          'forklift.konveyor.io/defaultTransferNetwork'
        ] || null;
      const matchingNetwork = openshiftNetworksQuery.data?.find(
        (network) =>
          network.name === providerDefaultNetworkName && network.namespace === targetNamespace
      );
      form.fields.migrationNetwork.setInitialValue(matchingNetwork?.name || null);
    }
  };

  return (
    <ResolvedQueries
      results={[inventoryProvidersQuery, clusterProvidersQuery]}
      errorTitles={[
        'Error loading provider inventory data',
        'Error loading providers from cluster',
      ]}
    >
      <Form className={spacing.pbXl}>
        <Title headingLevel="h2" size="md">
          Give your plan a name and a description
        </Title>
        <ValidatedTextInput
          field={form.fields.planName}
          label="Plan name"
          isRequired
          fieldId="plan-name"
          inputProps={{ isDisabled: !!planBeingEdited }}
        />
        <ValidatedTextInput
          component={TextArea}
          field={form.fields.planDescription}
          label="Plan description"
          fieldId="plan-description"
        />
        <Title headingLevel="h3" size="md">
          Select source and target providers
        </Title>
        <ProviderSelect
          label="Source provider"
          providerType={ProviderType.vsphere}
          field={form.fields.sourceProvider}
        />
        <ProviderSelect
          label="Target provider"
          providerType={ProviderType.openshift}
          field={form.fields.targetProvider}
        />
        <FormGroup
          label="Target namespace"
          isRequired
          fieldId="target-namespace"
          {...getFormGroupProps(form.fields.targetNamespace)}
        >
          <ResolvedQueries
            results={[namespacesQuery, openshiftNetworksQuery]}
            errorTitles={['Error loading namespaces', 'Error loading networks']}
            spinnerProps={{ className: spacing.mXs }}
            spinnerMode={QuerySpinnerMode.Inline}
          >
            <Select
              placeholderText="Select a namespace"
              isOpen={isNamespaceSelectOpen}
              onToggle={setIsNamespaceSelectOpen}
              onSelect={(_event, selection) => {
                form.fields.targetNamespace.setValue(selection as string);
                setIsNamespaceSelectOpen(false);
                onTargetNamespaceChange(selection as string);
              }}
              onFilter={(event) => getFilteredOptions(event.target.value)}
              selections={form.values.targetNamespace}
              variant="typeahead"
              isCreatable
              isGrouped
              id="target-namespace"
              aria-label="Target namespace"
              isDisabled={!form.values.targetProvider || !openshiftNetworksQuery.data}
            >
              {getFilteredOptions()}
            </Select>
            {form.values.targetNamespace ? (
              <>
                <TextContent className={spacing.mtMd}>
                  <Text component="p">
                    The migration transfer network for this migration plan is:{' '}
                    <strong>{form.values.migrationNetwork || POD_NETWORK.name}</strong>.
                    <Popover bodyContent="The default migration network defined for the OpenShift Virtualization provider is used if it exists in the target namespace. Otherwise, the pod network is used. You can select a different network for this migration plan.">
                      <button
                        aria-label="More info for migration transfer network field"
                        onClick={(e) => e.preventDefault()}
                        className="pf-c-form__group-label-help"
                      >
                        <HelpIcon noVerticalAlign />
                      </button>
                    </Popover>
                  </Text>
                </TextContent>
                <Button
                  variant="link"
                  isInline
                  onClick={toggleSelectNetworkModal}
                  className={spacing.mtXs}
                >
                  Select a different network
                </Button>
              </>
            ) : null}
          </ResolvedQueries>
        </FormGroup>
      </Form>
      {isSelectNetworkModalOpen ? (
        <SelectOpenShiftNetworkModal
          targetProvider={form.values.targetProvider}
          targetNamespace={form.values.targetNamespace}
          initialSelectedNetwork={form.values.migrationNetwork}
          instructions="Select the network that will be used for migrating data to the namespace."
          onClose={toggleSelectNetworkModal}
          onSubmit={(network) => {
            form.fields.migrationNetwork.setValue(network?.name || null);
            toggleSelectNetworkModal();
          }}
        />
      ) : null}
    </ResolvedQueries>
  );
};

export default GeneralForm;

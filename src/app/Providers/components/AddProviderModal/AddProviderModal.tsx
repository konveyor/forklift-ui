import * as React from 'react';
import * as yup from 'yup';
import { Modal, Button, Form, FormGroup, Alert, Spinner } from '@patternfly/react-core';
import { ConnectedIcon } from '@patternfly/react-icons';
import {
  useFormState,
  useFormField,
  getFormGroupProps,
  ValidatedTextInput,
} from '@konveyor/lib-ui';

import SimpleSelect, { OptionWithValue } from '@app/common/components/SimpleSelect';
import { ProviderType, PROVIDER_TYPE_NAMES } from '@app/common/constants';
import { usePausedPollingEffect } from '@app/common/context';
import { useCreateProviderMutation } from '@app/queries';

import './AddProviderModal.css';

interface IAddProviderModalProps {
  onClose: () => void;
}

const PROVIDER_TYPE_OPTIONS = Object.values(ProviderType).map((type) => ({
  toString: () => PROVIDER_TYPE_NAMES[type],
  value: type,
})) as OptionWithValue<ProviderType>[];

const useAddProviderFormState = () => {
  // TODO determine the actual validation criteria for this form -- these are for testing
  const providerTypeField = useFormField<ProviderType | null>(
    null,
    yup.mixed().label('Provider type').oneOf(Object.values(ProviderType)).required()
  );
  return {
    [ProviderType.vsphere]: useFormState({
      providerType: providerTypeField,
      name: useFormField('', yup.string().label('Name').min(2).max(20).required()),
      hostname: useFormField('', yup.string().label('Hostname').max(40).required()),
      username: useFormField('', yup.string().label('Username').max(20).required()),
      password: useFormField('', yup.string().label('Password').max(20).required()),
    }),
    [ProviderType.openshift]: useFormState({
      providerType: providerTypeField,
      clusterName: useFormField('', yup.string().label('Cluster name').max(40).required()),
      url: useFormField('', yup.string().label('URL').max(40).required()),
      saToken: useFormField('', yup.string().label('Service account token').max(20).required()),
    }),
  };
};

type AddProviderFormState = ReturnType<typeof useAddProviderFormState>; // ✨ Magic
export type VMwareProviderFormValues = AddProviderFormState[ProviderType.vsphere]['values'];
export type OpenshiftProviderFormValues = AddProviderFormState[ProviderType.openshift]['values'];
export type AddProviderFormValues = VMwareProviderFormValues | OpenshiftProviderFormValues;

const AddProviderModal: React.FunctionComponent<IAddProviderModalProps> = ({
  onClose,
}: IAddProviderModalProps) => {
  usePausedPollingEffect();

  const forms = useAddProviderFormState();
  const vmwareForm = forms[ProviderType.vsphere];
  const openshiftForm = forms[ProviderType.openshift];
  const providerTypeField = vmwareForm.fields.providerType;
  const providerType = providerTypeField.value;
  const formValues = providerType ? forms[providerType].values : vmwareForm.values;
  const isFormValid = providerType ? forms[providerType].isValid : false;

  const [createProvider, createProviderResult] = useCreateProviderMutation(providerType, onClose);
  // TODO render loading/error/result from returned createProviderResult

  return (
    <Modal
      className="addProviderModal"
      variant="small"
      title="Add provider"
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          isDisabled={!isFormValid || createProviderResult.isLoading}
          onClick={() => {
            createProvider(formValues);
            //TODO: tie in onClose to success or error from query. handle error somehow
            onClose();
          }}
        >
          Add
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      <Form>
        <FormGroup
          label="Type"
          isRequired
          fieldId="provider-type"
          className={!providerType ? 'extraSelectMargin' : ''}
          {...getFormGroupProps(providerTypeField)}
        >
          <SimpleSelect
            id="provider-type"
            aria-label="Provider type"
            options={PROVIDER_TYPE_OPTIONS}
            value={[PROVIDER_TYPE_OPTIONS.find((option) => option.value === providerType)]}
            onChange={(selection) => {
              providerTypeField.setValue((selection as OptionWithValue<ProviderType>).value);
              providerTypeField.setIsTouched(true);
            }}
            placeholderText="Select a provider type..."
          />
        </FormGroup>
        {providerType === ProviderType.vsphere ? (
          <>
            <ValidatedTextInput
              field={vmwareForm.fields.name}
              label="Name"
              isRequired
              fieldId="vmware-name"
            />
            <ValidatedTextInput
              field={vmwareForm.fields.hostname}
              label="Hostname"
              isRequired
              fieldId="vmware-hostname"
            />
            <ValidatedTextInput
              field={vmwareForm.fields.username}
              label="Username"
              isRequired
              fieldId="vmware-username"
            />
            <ValidatedTextInput
              field={vmwareForm.fields.password}
              type="password"
              label="Password"
              isRequired
              fieldId="vmware-password"
            />
          </>
        ) : null}
        {providerType === ProviderType.openshift ? (
          <>
            <ValidatedTextInput
              field={openshiftForm.fields.clusterName}
              label="Cluster name"
              isRequired
              fieldId="openshift-cluster-name"
            />
            <ValidatedTextInput
              field={openshiftForm.fields.url}
              label="URL"
              isRequired
              fieldId="openshift-url"
            />
            <ValidatedTextInput
              field={openshiftForm.fields.saToken}
              type="password"
              label="Service account token"
              isRequired
              fieldId="openshift-sa-token"
            />
          </>
        ) : null}
        {providerType ? (
          <div>
            <Button variant="link" isInline icon={<ConnectedIcon />} onClick={() => alert('TODO')}>
              Check connection
            </Button>
          </div>
        ) : null}
        {createProviderResult.isLoading ? <Spinner size="md" /> : null}
        {createProviderResult.isError ? (
          <Alert isInline variant="danger" title="Error creating provider">
            {JSON.stringify(createProviderResult.error)}
          </Alert>
        ) : null}
      </Form>
    </Modal>
  );
};

export default AddProviderModal;

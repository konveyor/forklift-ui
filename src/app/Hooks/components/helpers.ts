import * as yup from 'yup';
import { CLUSTER_API_VERSION, META } from '@app/common/constants';
import { IHook, IMetaObjectMeta } from '@app/queries/types';
import { IFormField, useFormField } from '@konveyor/lib-ui';
import React from 'react';
import { HookFormState } from './AddEditHookModal';
import { getHookNameSchema, playbookSchema } from '@app/queries';
import {
  PlanHookInstance,
  PlanHookInstanceFormState,
} from '@app/Plans/components/Wizard/PlanAddEditHookModal';

export type HookStep = 'PreHook' | 'PostHook';

export interface IHookDefinitionFields {
  name: IFormField<string>;
  type: IFormField<'playbook' | 'image'>;
  playbook: IFormField<string>;
  image: IFormField<string>;
  serviceAccount: IFormField<string>;
}

export const useHookDefinitionFields = (
  existingHookNames: string[],
  editingHookName: string | null,
  isNameRequired: boolean
): IHookDefinitionFields => {
  const type = useFormField('image', yup.mixed<'playbook' | 'image'>().required());
  // TODO how do we handle prefilling from generated names of owned hook CRs, and making sure we patch the right owned hook CRs?
  const nameSchema = getHookNameSchema(existingHookNames, editingHookName).label('Hook name');
  const imageSchema = yup.string().label('Custom container image');
  const requiredMessage = 'Hook definition fields are required';
  return {
    name: useFormField('', isNameRequired ? nameSchema.required() : nameSchema),
    type,
    playbook: useFormField(
      '',
      type.value === 'playbook' ? playbookSchema.required(requiredMessage) : playbookSchema
    ),
    image: useFormField(
      '',
      type.value === 'image' ? imageSchema.required(requiredMessage) : imageSchema
    ),
    serviceAccount: useFormField('', yup.string().label('Service account name')),
  };
};

export const generateHook = (values: HookFormState['values'], generateName: boolean): IHook => ({
  apiVersion: CLUSTER_API_VERSION,
  kind: 'Hook',
  metadata: {
    ...(generateName ? { generateName: `${values.name}-` } : { name: values.name }),
    namespace: META.namespace,
  },
  spec: {
    ...(values.type === 'playbook'
      ? { playbook: btoa(values.playbook), image: 'quay.io/konveyor/hook-runner:latest' }
      : { image: values.image }),
    ...(values.serviceAccount ? { serviceAccount: values.serviceAccount } : {}),
  },
});

export const populateHookFields = (
  fields: HookFormState['fields'],
  hook: IHook | null,
  setFn: 'setValue' | 'setInitialValue',
  isTouched: boolean
): void => {
  fields.name[setFn]((hook && (hook.metadata as IMetaObjectMeta).name) || '');
  fields.type[setFn](hook?.spec.playbook ? 'playbook' : 'image');
  fields.playbook[setFn](atob(hook?.spec.playbook || ''));
  if (!hook?.spec.playbook) {
    fields.image[setFn](hook?.spec.image || '');
  } else {
    fields.image[setFn](hook?.spec.image || '');
  }
  fields.serviceAccount[setFn](hook?.spec.serviceAccount || '');
  if (isTouched) {
    fields.name.setIsTouched(true);
    fields.type.setIsTouched(true);
    fields.playbook.setIsTouched(true);
    if (!hook?.spec.playbook) {
      fields.image.setIsTouched(true);
    }
  }
};

interface IEditHookPrefillEffect {
  isDonePrefilling: boolean;
}

export const useEditHookPrefillEffect = (
  form: HookFormState,
  hookBeingEdited: IHook | null
): IEditHookPrefillEffect => {
  const [isStartedPrefilling, setIsStartedPrefilling] = React.useState(false);
  const [isDonePrefilling, setIsDonePrefilling] = React.useState(!hookBeingEdited);
  React.useEffect(() => {
    if (!isStartedPrefilling && hookBeingEdited) {
      setIsStartedPrefilling(true);
      populateHookFields(form.fields, hookBeingEdited, 'setInitialValue', false);
      // Wait for effects to run based on field changes first
      window.setTimeout(() => {
        setIsDonePrefilling(true);
      }, 0);
    }
  }, [isStartedPrefilling, form, hookBeingEdited]);
  return { isDonePrefilling };
};

export const useEditPlanHookInstancePrefillEffect = (
  form: PlanHookInstanceFormState,
  instanceBeingEdited: PlanHookInstance | null
): IEditHookPrefillEffect => {
  const { isDonePrefilling: isDonePrefillingDefinitionFields } = useEditHookPrefillEffect(
    form,
    instanceBeingEdited ? generateHook(instanceBeingEdited, false) : null
  );
  const [isStartedPrefilling, setIsStartedPrefilling] = React.useState(false);
  const [isDonePrefillingInstanceFields, setIsDonePrefillingInstanceFields] = React.useState(
    !instanceBeingEdited
  );
  React.useEffect(() => {
    if (!isStartedPrefilling && instanceBeingEdited) {
      setIsStartedPrefilling(true);
      form.fields.step.setInitialValue(instanceBeingEdited.step);
      // Wait for effects to run based on field changes first
      window.setTimeout(() => {
        setIsDonePrefillingInstanceFields(true);
      }, 0);
    }
  }, [isStartedPrefilling, form, instanceBeingEdited]);
  return { isDonePrefilling: isDonePrefillingDefinitionFields && isDonePrefillingInstanceFields };
};
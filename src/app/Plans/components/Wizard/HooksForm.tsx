import * as React from 'react';
import { EditIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import {
  TextContent,
  Text,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Popover,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { TableComposable, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';

import { PlanWizardFormState } from './PlanWizard';
import PlanAddEditHookModal, { PlanHookInstance } from './PlanAddEditHookModal';

import './HooksForm.css';
import ConditionalTooltip from '@app/common/components/ConditionalTooltip';
import ConfirmModal from '@app/common/components/ConfirmModal';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import a11yLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

SyntaxHighlighter.registerLanguage('yaml', yaml);

interface IHooksFormProps {
  form: PlanWizardFormState['hooks'];
  isWarmMigration: boolean;
}

// TODO remove name field entirely, for instances (not for hooks page? also remove hooks page maybe?)
// TODO if we remove the hooks page we'll need to remove the create/existing selection, it'll always be create mode
// TODO we'd also remove all notion of owned hooks / shared hooks, forklift.konveyor.io/shared etc
// TODO either way we'll need a way to identify the existing hook name/namespace of each instance if editing a plan

const HooksForm: React.FunctionComponent<IHooksFormProps> = ({
  form,
  isWarmMigration,
}: IHooksFormProps) => {
  const [isAddEditModalOpen, toggleAddEditModal] = React.useReducer((isOpen) => !isOpen, false);

  const sortedInstances = [...form.values.instances].sort((a, b) => {
    if (a.step === 'PreHook' && b.step === 'PostHook') return -1;
    if (a.step === 'PostHook' && b.step === 'PreHook') return 1;
    return 0;
  });

  const hasPreHook = !!sortedInstances.find((instance) => instance.step === 'PreHook');
  const hasPostHook = !!sortedInstances.find((instance) => instance.step === 'PostHook');
  const migrationOrCutover = !isWarmMigration ? 'migration' : 'cutover';

  const [isRemoveModalOpen, toggleRemoveModal] = React.useReducer((isOpen) => !isOpen, false);
  const [instanceBeingRemoved, setInstanceBeingRemoved] = React.useState<PlanHookInstance | null>(
    null
  );

  const [instanceBeingEdited, setInstanceBeingEdited] = React.useState<PlanHookInstance | null>(
    null
  );

  return (
    <>
      <TextContent className={spacing.mbMd}>
        <Text component="p">
          Hooks are contained in Ansible playbooks that can be run before or after the migration.
        </Text>
      </TextContent>
      {form.values.instances.length === 0 ? (
        <EmptyState className={spacing.my_2xl}>
          <EmptyStateIcon icon={PlusCircleIcon} />
          <EmptyStateBody className={spacing.mt_0}>
            No hooks have been added to this migration plan
          </EmptyStateBody>
          <Button variant="secondary" className={spacing.mtMd} onClick={toggleAddEditModal}>
            Add hook
          </Button>
        </EmptyState>
      ) : (
        <>
          <ConditionalTooltip
            isTooltipEnabled={hasPreHook && hasPostHook}
            content={`Only one pre-${migrationOrCutover} hook and one post-${migrationOrCutover} hook are allowed.`}
          >
            <span>
              <Button
                variant="secondary"
                onClick={toggleAddEditModal}
                isDisabled={hasPreHook && hasPostHook}
              >
                Add hook
              </Button>
            </span>
          </ConditionalTooltip>
          <TableComposable>
            <Thead>
              <Tr>
                <Th>Migration step</Th>
                <Th>Type</Th>
                <Th>Definition</Th>
                <Th aria-label="Actions"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedInstances.map((instance, i) => (
                <Tr key={`${instance.step}-${i}`}>
                  <Td>
                    {instance.step === 'PreHook'
                      ? `Pre-${migrationOrCutover}`
                      : `Post-${migrationOrCutover}`}
                  </Td>
                  <Td>
                    {instance.type === 'playbook' ? 'Ansible playbook' : 'Custom container image'}
                  </Td>
                  <Td>
                    {instance.type === 'playbook' ? (
                      <Popover
                        className="playbook-yaml-popover"
                        aria-label="Playbook YAML contents"
                        bodyContent={
                          <SyntaxHighlighter language="yaml" style={a11yLight}>
                            {instance.playbook}
                          </SyntaxHighlighter>
                        }
                        enableFlip
                      >
                        <Button variant="link" isInline>
                          View YAML
                        </Button>
                      </Popover>
                    ) : (
                      instance.image
                    )}
                  </Td>
                  <Td modifier="fitContent">
                    <Button
                      variant="plain"
                      aria-label="Edit"
                      onClick={() => {
                        setInstanceBeingEdited(instance);
                        toggleAddEditModal();
                      }}
                    >
                      <EditIcon />
                    </Button>
                    <Button
                      variant="plain"
                      aria-label="Remove"
                      onClick={() => {
                        setInstanceBeingRemoved(instance);
                        toggleRemoveModal();
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableComposable>
        </>
      )}
      {isAddEditModalOpen ? (
        <PlanAddEditHookModal
          onClose={() => {
            toggleAddEditModal();
            setInstanceBeingEdited(null);
          }}
          onSave={(newHookInstance: PlanHookInstance) => {
            const otherInstances = form.values.instances.filter(
              (instance) => instance !== instanceBeingEdited
            );
            form.fields.instances.setValue([...otherInstances, newHookInstance]);
            toggleAddEditModal();
          }}
          instanceBeingEdited={instanceBeingEdited}
          isWarmMigration={isWarmMigration}
          hasPreHook={hasPreHook}
          hasPostHook={hasPostHook}
          existingInstanceNames={form.values.instances.map((instance) => instance.name)}
        />
      ) : null}
      <ConfirmModal
        isOpen={isRemoveModalOpen}
        toggleOpen={toggleRemoveModal}
        mutateFn={() => {
          form.fields.instances.setValue(
            form.values.instances.filter((i) => i !== instanceBeingRemoved)
          );
          toggleRemoveModal();
        }}
        title="Remove hook"
        confirmButtonText="Remove"
        body={
          <>
            Are you sure you want to remove the hook &quot;
            <strong>{instanceBeingRemoved?.name}</strong>&quot; from the migration plan?
          </>
        }
      />
    </>
  );
};

export default HooksForm;
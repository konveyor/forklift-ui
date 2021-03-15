import * as React from 'react';
import { Modal, Stack, Flex, Button } from '@patternfly/react-core';
import { MutationResult } from 'react-query';
import { QuerySpinnerMode, ResolvedQuery } from './ResolvedQuery';

// TODO lib-ui candidate

interface IConfirmModalProps {
  isOpen: boolean;
  toggleOpen: () => void;
  mutateFn: () => void;
  mutateResult: MutationResult<unknown>;
  title: string;
  body: React.ReactNode;
  confirmButtonText: string;
  cancelButtonText?: string;
  errorText: string;
}

const ConfirmModal: React.FunctionComponent<IConfirmModalProps> = ({
  isOpen,
  toggleOpen,
  mutateFn,
  mutateResult,
  title,
  body,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  errorText,
}: IConfirmModalProps) => {
  React.useEffect(() => {
    if (!isOpen) mutateResult.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return isOpen ? (
    <Modal
      variant="small"
      title={title}
      isOpen
      onClose={toggleOpen}
      footer={
        <Stack hasGutter>
          <ResolvedQuery
            result={mutateResult}
            errorTitle={errorText}
            spinnerMode={QuerySpinnerMode.Inline}
          />
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <Button
              id="modal-confirm-button"
              key="confirm"
              variant="primary"
              onClick={mutateFn}
              isDisabled={mutateResult.isLoading}
            >
              {confirmButtonText}
            </Button>
            <Button
              id="modal-cancel-button"
              key="cancel"
              variant="link"
              onClick={toggleOpen}
              isDisabled={mutateResult.isLoading}
            >
              {cancelButtonText}
            </Button>
          </Flex>
        </Stack>
      }
    >
      {body}
    </Modal>
  ) : null;
};

export default ConfirmModal;

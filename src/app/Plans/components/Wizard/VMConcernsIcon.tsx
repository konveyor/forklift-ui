import * as React from 'react';
import { IVMwareVM } from '@app/queries/types';
import { StatusIcon } from '@konveyor/lib-ui';

import { getMostSevereVMConcern, getVMConcernStatusLabel, getVMConcernStatusType } from './helpers';
interface IVMConcernsIconProps {
  vm: IVMwareVM;
}

const VMConcernsIcon: React.FunctionComponent<IVMConcernsIconProps> = ({
  vm,
}: IVMConcernsIconProps) => {
  if (vm.revisionValidated !== vm.revision) {
    return <StatusIcon status="Loading" label="Analysing" />;
  }
  const worstConcern = getMostSevereVMConcern(vm);
  const statusType = getVMConcernStatusType(worstConcern);
  const statusLabel = getVMConcernStatusLabel(worstConcern);
  return statusType ? <StatusIcon status={statusType} label={statusLabel} /> : null;
};

export default VMConcernsIcon;

import * as React from 'react';
import {
  ResourcesAlmostEmptyIcon,
  ResourcesAlmostFullIcon,
  ResourcesFullIcon,
} from '@patternfly/react-icons';
import {
  global_danger_color_100 as dangerColor,
  global_disabled_color_200 as disabledColor,
  global_info_color_100 as infoColor,
  global_success_color_100 as successColor,
} from '@patternfly/react-tokens';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';

import { IStep, IVMStatus } from '@app/queries/types';

interface IStepProps {
  status: IVMStatus;
  step: IStep;
  index: number;
}

const Step: React.FunctionComponent<IStepProps> = ({ status, step, index }: IStepProps) => {
  if (status.completed || step.progress.completed === step.progress.total) {
    return (
      <ResourcesFullIcon
        className={spacing.mlSm}
        height="1em"
        width="1em"
        color={successColor.value}
      />
    );
  } else if (status.started && index + 1 === status.step) {
    return (
      <ResourcesAlmostFullIcon
        className={spacing.mlSm}
        height="1em"
        width="1em"
        color={status.error.phase ? dangerColor.value : infoColor.value}
      />
    );
  } else {
    return (
      <ResourcesAlmostEmptyIcon
        className={spacing.mlSm}
        height="1em"
        width="1em"
        color={disabledColor.value}
      />
    );
  }
};

export default Step;

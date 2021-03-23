import { PlanStatusType, PlanStatusDisplayType } from '@app/common/constants';
import { hasCondition } from '@app/common/helpers';
import { IPlan } from '@app/queries/types';
import { IMigration } from '@app/queries/types/migrations.types';

export const getPlanStatusTitle = (plan: IPlan): string => {
  const condition = plan.status?.conditions.find(
    (condition) =>
      condition.type === PlanStatusType.Ready ||
      condition.type === PlanStatusType.Executing ||
      condition.type === PlanStatusType.Succeeded ||
      condition.type === PlanStatusType.Failed
  );
  return condition ? PlanStatusDisplayType[condition.type] : '';
};

// TODO maybe generalize this for cold migrations too
type WarmPlanState =
  | 'NotStarted'
  | 'Starting'
  | 'Copying'
  | 'AbortedCopying'
  | 'StartingCutover'
  | 'Cutover'
  | 'Finished';

export const getWarmPlanState = (
  plan: IPlan | null,
  migration: IMigration | null
): WarmPlanState | null => {
  if (!plan || !plan.spec.warm) return null;
  if (!migration) return 'NotStarted';
  if (!!migration && (plan.status?.migration?.vms?.length || 0) === 0) return 'Starting';
  const conditions = plan.status?.conditions || [];
  if (
    (hasCondition(conditions, PlanStatusType.Canceled) ||
      hasCondition(conditions, PlanStatusType.Failed)) &&
    !migration.spec.cutover
  ) {
    return 'AbortedCopying';
  }
  if (!!migration && !!plan.status?.migration?.completed) return 'Finished';
  if (hasCondition(conditions, PlanStatusType.Executing)) {
    const pipelineHasStarted = plan.status?.migration?.vms?.some((vm) =>
      vm.pipeline.some((step) => !!step.started)
    );
    if (migration.spec.cutover && !pipelineHasStarted) {
      return 'StartingCutover';
    }
    if (migration.spec.cutover && pipelineHasStarted) {
      return 'Cutover';
    }
    if (plan.status?.migration?.vms?.some((vm) => (vm.warm?.precopies.length || 0) > 0)) {
      return 'Copying';
    }
    return 'Starting';
  }
  if (
    hasCondition(conditions, PlanStatusType.Succeeded) ||
    hasCondition(conditions, PlanStatusType.Canceled) ||
    hasCondition(conditions, PlanStatusType.Failed)
  ) {
    return 'Finished';
  }
  return null;
};

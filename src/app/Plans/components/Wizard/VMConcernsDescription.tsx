import * as React from 'react';
import { StatusIcon, StatusType } from '@konveyor/lib-ui';
import { TextContent, Text, List, ListItem, Flex, FlexItem } from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { PRODUCT_DOCO_LINK } from '@app/common/constants';
import { IVMwareVM } from '@app/queries/types';
import { getMostSevereVMConcern, getVMConcernStatusType } from './helpers';
import './VMConcernsDescription.css';

interface IVMConcernsDescriptionProps {
  vm: IVMwareVM;
  filterText?: string;
}

const VMConcernsDescription: React.FunctionComponent<IVMConcernsDescriptionProps> = ({
  vm,
  filterText,
}: IVMConcernsDescriptionProps) => {
  const worstConcern = getMostSevereVMConcern(vm);
  const conditionsText = !worstConcern ? (
    <>No conditions have been identified that would make this VM a risk to migrate.</>
  ) : worstConcern.category === 'Critical' ? (
    <>
      Conditions have been identified that make this VM a <strong>high risk</strong> to migrate.
    </>
  ) : worstConcern.category === 'Warning' ? (
    <>
      Conditions have been identified that make this VM a <strong>moderate risk</strong> to migrate.
    </>
  ) : worstConcern.category === 'Information' || worstConcern.category === 'Advisory' ? (
    <>Conditions have been identified, but they do not affect the migration risk.</>
  ) : null;
  if (vm.revisionValidated < vm.revision) {
    return (
      <TextContent className={spacing.myMd}>
        <Text component="p">Completing migration Analysis. This might take a few minutes.</Text>
      </TextContent>
    );
  } else {
    return (
      <TextContent className={spacing.myMd} style={{ maxWidth: '100%' }}>
        <Text component="p">{conditionsText}</Text>
        {vm.concerns && vm.concerns.length > 0 ? (
          <List style={{ listStyle: 'none' }}>
            {vm.concerns.map((concern, index) => {
              const matchesFilter =
                filterText &&
                `${concern.label}: ${concern.assessment}`
                  .toLowerCase()
                  .indexOf(filterText.toLowerCase()) !== -1;
              return (
                <ListItem key={`${index}-${concern.label}`}>
                  <Flex
                    spaceItems={{ default: 'spaceItemsSm' }}
                    alignItems={{ default: 'alignItemsFlexStart' }}
                    flexWrap={{ default: 'nowrap' }}
                    className={matchesFilter ? 'matches-analysis-filter' : ''}
                  >
                    <FlexItem>
                      <StatusIcon status={getVMConcernStatusType(concern) || StatusType.Warning} />
                    </FlexItem>
                    <FlexItem>
                      <strong>{concern.label}:</strong> {concern.assessment}
                    </FlexItem>
                  </Flex>
                </ListItem>
              );
            })}
          </List>
        ) : null}
        <Text component="p">
          See the{' '}
          <a href={PRODUCT_DOCO_LINK.href} target="_blank" rel="noreferrer">
            {PRODUCT_DOCO_LINK.label}
          </a>{' '}
          for more information.
        </Text>
      </TextContent>
    );
  }
};

export default VMConcernsDescription;

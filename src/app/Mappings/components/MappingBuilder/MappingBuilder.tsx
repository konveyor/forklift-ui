import * as React from 'react';
import * as yup from 'yup';
import { Button, TextContent, Text, Grid, GridItem, Bullseye, Flex } from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { MappingType, MappingSource, MappingTarget } from '@app/queries/types';
import LineArrow from '@app/common/components/LineArrow';
import MappingSourceSelect from './MappingSourceSelect';
import MappingTargetSelect from './MappingTargetSelect';
import { getMappingSourceTitle, getMappingTargetTitle } from '../helpers';
import ConditionalTooltip from '@app/common/components/ConditionalTooltip';

import './MappingBuilder.css';

export interface IMappingBuilderItem {
  source: MappingSource | null;
  target: MappingTarget | null;
  highlight: boolean; // Highlight items that were automatically added for missing sources in the wizard
}

export const mappingBuilderItemsSchema = yup
  .array<IMappingBuilderItem>()
  .required()
  .test('no-empty-selections', 'All sources must be mapped to a target.', (builderItems) =>
    builderItems ? builderItems.every((item) => item.source && item.target) : false
  );

interface IMappingBuilderProps {
  mappingType: MappingType;
  availableSources: MappingSource[];
  availableTargets: MappingTarget[];
  builderItems: IMappingBuilderItem[];
  setBuilderItems: (groups: IMappingBuilderItem[]) => void;
  isWizardMode?: boolean;
  hasItemsAddedMessage?: boolean;
}

export const MappingBuilder: React.FunctionComponent<IMappingBuilderProps> = ({
  mappingType,
  availableSources,
  availableTargets,
  builderItems,
  setBuilderItems,
  isWizardMode = false,
  hasItemsAddedMessage = false,
}: IMappingBuilderProps) => {
  const messageSelectBoth = 'You must select a source and target before adding another mapping.';
  const messageExhausted = `All source ${
    mappingType === MappingType.Network ? 'networks' : 'datastores'
  } have been mapped.`;

  const getTooltipContent = () => {
    if (builderItems.length === availableSources.length) {
      return messageExhausted;
    }
    return messageSelectBoth;
  };

  const reset = () => setBuilderItems([{ source: null, target: null, highlight: false }]);
  const isReset = builderItems.length === 1 && !builderItems[0].source && !builderItems[0].target;
  const addEmptyItem = () =>
    setBuilderItems([...builderItems, { source: null, target: null, highlight: false }]);
  const removeItem = (itemIndex: number) => {
    if (builderItems.length > 1) {
      setBuilderItems(builderItems.filter((_item, index) => index !== itemIndex));
    } else {
      reset();
    }
  };

  let instructionText = '';
  if (mappingType === MappingType.Network) {
    instructionText = 'Map source and target networks.';
  }
  if (mappingType === MappingType.Storage) {
    instructionText = 'Map source datastores to target storage classes.';
  }
  if (hasItemsAddedMessage) {
    instructionText = `${instructionText} Sources missing from your selected mapping have been added.`;
  }
  if (mappingType === MappingType.Network) {
    instructionText = `${instructionText} The default OpenShift pod network is pre-selected. Other networks can be selected in the dropdowns.`;
  }
  if (mappingType === MappingType.Storage) {
    instructionText = `${instructionText} The default storage class is pre-selected. Other storage classes can be selected in the dropdowns.`;
  }

  return (
    <>
      <TextContent>
        <Text component="p">{instructionText}</Text>
      </TextContent>
      {builderItems.map((item, itemIndex) => {
        const key = item.source ? `${item.source.id}` : `empty-${itemIndex}`;
        return (
          <Grid key={key}>
            {itemIndex === 0 ? (
              <>
                <GridItem span={5} className={spacing.pbSm}>
                  <label className="pf-c-form__label">
                    <span className="pf-c-form__label-text">
                      {getMappingSourceTitle(mappingType)}
                    </span>
                  </label>
                </GridItem>
                <GridItem span={isWizardMode ? 2 : 1} />
                <GridItem span={5} className={spacing.pbSm}>
                  <label className="pf-c-form__label">
                    <span className="pf-c-form__label-text">
                      {getMappingTargetTitle(mappingType)}
                    </span>
                  </label>
                </GridItem>
                {isWizardMode ? null : <GridItem span={1} />}
              </>
            ) : null}
            <GridItem span={5} className={`mapping-builder-box ${spacing.pSm}`}>
              {isWizardMode && item.source ? (
                <Bullseye style={{ justifyContent: 'left' }} className={spacing.plSm}>
                  {item.source.name}
                </Bullseye>
              ) : (
                <MappingSourceSelect
                  id={`mapping-sources-for-${key}`}
                  builderItems={builderItems}
                  itemIndex={itemIndex}
                  setBuilderItems={setBuilderItems}
                  availableSources={availableSources}
                />
              )}
            </GridItem>
            <GridItem span={isWizardMode ? 2 : 1}>
              <Bullseye>
                <LineArrow />
              </Bullseye>
            </GridItem>
            <GridItem
              span={5}
              className={`mapping-builder-box ${spacing.pSm} ${
                isWizardMode && item.highlight ? 'highlighted' : ''
              }`}
            >
              <MappingTargetSelect
                id={`mapping-target-for-${key}`}
                builderItems={builderItems}
                itemIndex={itemIndex}
                setBuilderItems={setBuilderItems}
                availableTargets={availableTargets}
                mappingType={mappingType}
              />
            </GridItem>
            {isWizardMode ? null : (
              <GridItem span={1}>
                <Bullseye>
                  <Button
                    variant="plain"
                    aria-label="Remove mapping"
                    onClick={() => removeItem(itemIndex)}
                    isDisabled={isReset}
                  >
                    <TrashIcon />
                  </Button>
                </Bullseye>
              </GridItem>
            )}
          </Grid>
        );
      })}
      {isWizardMode ? null : (
        <Flex
          justifyContent={{ default: 'justifyContentCenter' }}
          spaceItems={{ default: 'spaceItemsMd' }}
        >
          <ConditionalTooltip
            isTooltipEnabled={
              !builderItems.every((item) => item.source && item.target) ||
              builderItems.length === availableSources.length
            }
            content={getTooltipContent()}
            position="bottom"
          >
            <div>
              <Button
                isDisabled={
                  !builderItems.every((item) => item.source && item.target) ||
                  builderItems.length === availableSources.length
                }
                variant="secondary"
                icon={<PlusCircleIcon />}
                onClick={addEmptyItem}
              >
                Add
              </Button>
            </div>
          </ConditionalTooltip>
          <Button variant="secondary" onClick={reset} isDisabled={isReset}>
            Remove all
          </Button>
        </Flex>
      )}
    </>
  );
};

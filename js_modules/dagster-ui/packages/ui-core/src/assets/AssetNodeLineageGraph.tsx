import {Box, Spinner} from '@dagster-io/ui-components';
import React, {useMemo, useRef, useState} from 'react';
import {useHistory} from 'react-router-dom';
import styled from 'styled-components';

import {SVGSaveZoomLevel, useLastSavedZoomLevel} from './SavedZoomLevel';
import {assetDetailsPathForKey} from './assetDetailsPathForKey';
import {AssetKey, AssetViewParams} from './types';
import {useFeatureFlags} from '../app/Flags';
import {AssetEdges} from '../asset-graph/AssetEdges';
import {AssetGraphBackgroundContextMenu} from '../asset-graph/AssetGraphBackgroundContextMenu';
import {MINIMAL_SCALE} from '../asset-graph/AssetGraphExplorer';
import {AssetNode, AssetNodeContextMenuWrapper, AssetNodeMinimal} from '../asset-graph/AssetNode';
import {AssetNode2025} from '../asset-graph/AssetNode2025';
import {AssetNodeFacetSettingsButton} from '../asset-graph/AssetNodeFacetSettingsButton';
import {useSavedAssetNodeFacets} from '../asset-graph/AssetNodeFacets';
import {ExpandedGroupNode, GroupOutline} from '../asset-graph/ExpandedGroupNode';
import {AssetNodeLink} from '../asset-graph/ForeignNode';
import {AssetGraphSettingsButton, useLayoutDirectionState} from '../asset-graph/GraphSettings';
import {GraphData, GraphNode, groupIdForNode, toGraphId} from '../asset-graph/Utils';
import {DEFAULT_MAX_ZOOM} from '../graph/SVGConsts';
import {SVGViewport, SVGViewportRef} from '../graph/SVGViewport';
import {useAssetLayout} from '../graph/asyncGraphLayout';
import {isNodeOffscreen} from '../graph/common';
import {AssetKeyInput} from '../graphql/types';
import {useOpenInNewTab} from '../hooks/useOpenInNewTab';
export type AssetNodeLineageGraphProps = {
  assetKey: AssetKeyInput;
  assetGraphData: GraphData;
  params: AssetViewParams;
};

export const AssetNodeLineageGraph = (props: AssetNodeLineageGraphProps) => {
  return <AssetNodeLineageGraphInner {...props} />;
};

const AssetNodeLineageGraphInner = ({
  assetKey,
  assetGraphData,
  params,
}: AssetNodeLineageGraphProps) => {
  const openInNewTab = useOpenInNewTab();
  const assetGraphId = toGraphId(assetKey);

  const {allGroups, groupedAssets} = useMemo(() => {
    const groupedAssets: Record<string, GraphNode[]> = {};
    Object.values(assetGraphData.nodes).forEach((node) => {
      const groupId = groupIdForNode(node);
      groupedAssets[groupId] = groupedAssets[groupId] || [];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupedAssets[groupId]!.push(node);
    });
    return {allGroups: Object.keys(groupedAssets), groupedAssets};
  }, [assetGraphData]);

  const [highlighted, setHighlighted] = useState<string[] | null>(null);
  const [direction, setDirection] = useLayoutDirectionState();
  const [facets, setFacets] = useSavedAssetNodeFacets();

  const {flagAssetNodeFacets} = useFeatureFlags();

  const {layout, loading} = useAssetLayout(
    assetGraphData,
    allGroups,
    useMemo(
      () => ({direction, facets: flagAssetNodeFacets ? Array.from(facets) : false}),
      [direction, facets, flagAssetNodeFacets],
    ),
  );
  const viewportEl = useRef<SVGViewportRef>();
  const history = useHistory();

  const onClickAsset = (e: React.MouseEvent<any>, key: AssetKey) => {
    const path = assetDetailsPathForKey(key, {
      ...params,
      lineageScope: 'neighbors',
      lineageDepth: 1,
    });
    if (e.metaKey) {
      openInNewTab(path);
    } else {
      history.push(path);
    }
  };

  useLastSavedZoomLevel(viewportEl, layout, assetGraphId);

  if (!layout || loading) {
    return (
      <Box style={{flex: 1}} flex={{alignItems: 'center', justifyContent: 'center'}}>
        <Spinner purpose="page" />
      </Box>
    );
  }

  return (
    <AssetGraphBackgroundContextMenu direction={direction} setDirection={setDirection}>
      <SVGViewport
        ref={(r) => {
          viewportEl.current = r || undefined;
        }}
        defaultZoom="zoom-to-fit"
        graphWidth={layout.width}
        graphHeight={layout.height}
        onDoubleClick={(e) => {
          viewportEl.current?.autocenter(true);
          e.stopPropagation();
        }}
        maxZoom={DEFAULT_MAX_ZOOM}
        maxAutocenterZoom={DEFAULT_MAX_ZOOM}
        additionalToolbarElements={
          <>
            <AssetGraphSettingsButton direction={direction} setDirection={setDirection} />
            {flagAssetNodeFacets ? (
              <AssetNodeFacetSettingsButton value={facets} onChange={setFacets} />
            ) : undefined}
          </>
        }
      >
        {({scale}, viewportRect) => (
          <SVGContainer width={layout.width} height={layout.height}>
            {viewportEl.current && <SVGSaveZoomLevel scale={scale} />}

            {Object.values(layout.groups)
              .filter((node) => !isNodeOffscreen(node.bounds, viewportRect))
              .sort((a, b) => a.id.length - b.id.length)
              .map((group) => (
                <foreignObject
                  {...group.bounds}
                  key={`${group.id}-outline`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <GroupOutline minimal={scale < MINIMAL_SCALE} />
                </foreignObject>
              ))}

            <AssetEdges
              selected={null}
              highlighted={highlighted}
              edges={layout.edges}
              viewportRect={viewportRect}
              direction={direction}
            />

            {Object.values(layout.groups)
              .filter((node) => !isNodeOffscreen(node.bounds, viewportRect))
              .sort((a, b) => a.id.length - b.id.length)
              .map((group) => (
                <foreignObject {...group.bounds} key={group.id}>
                  <ExpandedGroupNode
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    group={{...group, assets: groupedAssets[group.id]!}}
                    minimal={scale < MINIMAL_SCALE}
                    setHighlighted={setHighlighted}
                  />
                </foreignObject>
              ))}

            {Object.values(layout.nodes)
              .filter((node) => !isNodeOffscreen(node.bounds, viewportRect))
              .map(({id, bounds}) => {
                const graphNode = assetGraphData.nodes[id];
                const path = JSON.parse(id);

                const contextMenuProps = {
                  graphData: assetGraphData,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  node: graphNode!,
                };

                return (
                  <foreignObject
                    {...bounds}
                    key={id}
                    style={{overflow: 'visible'}}
                    onMouseEnter={() => setHighlighted([id])}
                    onMouseLeave={() => setHighlighted(null)}
                    onClick={(e) => onClickAsset(e, {path})}
                    onDoubleClick={(e) => {
                      viewportEl.current?.zoomToSVGBox(bounds, true, 1.2);
                      e.stopPropagation();
                    }}
                  >
                    {!graphNode ? (
                      <AssetNodeLink assetKey={{path}} />
                    ) : scale < MINIMAL_SCALE || (flagAssetNodeFacets && facets.size === 0) ? (
                      <AssetNodeContextMenuWrapper {...contextMenuProps}>
                        <AssetNodeMinimal
                          facets={flagAssetNodeFacets ? facets : null}
                          definition={graphNode.definition}
                          selected={graphNode.id === assetGraphId}
                          height={bounds.height}
                        />
                      </AssetNodeContextMenuWrapper>
                    ) : (
                      <AssetNodeContextMenuWrapper {...contextMenuProps}>
                        {flagAssetNodeFacets ? (
                          <AssetNode2025
                            facets={facets}
                            definition={graphNode.definition}
                            selected={graphNode.id === assetGraphId}
                          />
                        ) : (
                          <AssetNode
                            definition={graphNode.definition}
                            selected={graphNode.id === assetGraphId}
                          />
                        )}
                      </AssetNodeContextMenuWrapper>
                    )}
                  </foreignObject>
                );
              })}
          </SVGContainer>
        )}
      </SVGViewport>
    </AssetGraphBackgroundContextMenu>
  );
};

const SVGContainer = styled.svg`
  overflow: visible;
  border-radius: 0;
`;

/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  forwardRef,
  memo,
  MouseEvent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
} from "react"
import { StatefulMenu } from "baseui/menu"
import { MoreVert } from "@emotion-icons/material-rounded"

import { useTheme } from "@emotion/react"
import {
  EmotionTheme,
  BaseButton,
  BaseButtonKind,
  Icon,
  IGuestToHostMessage,
  IMenuItem,
  Config,
  GitInfo,
  IGitInfo,
  PageConfig,
} from "@streamlit/lib"
import { PLACEMENT, StatefulPopover } from "baseui/popover"
import {
  DetachedHead,
  ModuleIsNotAdded,
  NoRepositoryDetected,
} from "@streamlit/app/src/components/StreamlitDialog/DeployErrorDialogs"
import { DEPLOY_URL, STREAMLIT_CLOUD_URL } from "@streamlit/app/src/urls"
import { SegmentMetricsManager } from "@streamlit/app/src/SegmentMetricsManager"
import {
  StyledCoreItem,
  StyledDevItem,
  StyledMenuDivider,
  StyledMenuItem,
  StyledMenuItemLabel,
  StyledMenuItemShortcut,
  StyledRecordingIndicator,
  StyledMenuContainer,
  StyledMainMenuContainer,
} from "./styled-components"

const { GitStates } = GitInfo

const SCREENCAST_LABEL: { [s: string]: string } = {
  COUNTDOWN: "Cancel screencast",
  RECORDING: "Stop recording",
}

export interface Props {
  /** True if we're connected to the Streamlit server. */
  isServerConnected: boolean

  /** Rerun the current script. */
  quickRerunCallback: () => void

  /** Reload git information message */
  loadGitInfo: () => void

  /** Clear the cache. */
  clearCacheCallback: () => void

  /** Show the screen recording dialog. */
  screencastCallback: () => void

  /** Show the Settings dialog. */
  settingsCallback: () => void

  /** Show the About dialog. */
  aboutCallback: () => void

  /** Open the Print Dialog, if the app is in iFrame first open a new tab with app URL */
  printCallback: () => void

  screenCastState: string

  hostMenuItems: IMenuItem[]

  sendMessageToHost: (message: IGuestToHostMessage) => void

  gitInfo: IGitInfo | null

  showDeployError: (
    title: string,
    errorNode: ReactNode,
    onContinue?: () => void
  ) => void

  closeDialog: () => void

  isDeployErrorModalOpen: boolean

  canDeploy: boolean

  menuItems?: PageConfig.IMenuItems | null

  developmentMode: boolean

  toolbarMode: Config.ToolbarMode

  metricsMgr: SegmentMetricsManager
}

const getOpenInWindowCallback = (url: string) => (): void => {
  window.open(url, "_blank")
}

export const getDeployAppUrl = (gitInfo: IGitInfo | null): (() => void) => {
  // If the app was run inside a GitHub repo, autofill for a one-click deploy.
  // E.g.: https://share.streamlit.io/deploy?repository=melon&branch=develop&mainModule=streamlit_app.py
  if (gitInfo) {
    const deployUrl = new URL(DEPLOY_URL)

    deployUrl.searchParams.set("repository", gitInfo.repository || "")
    deployUrl.searchParams.set("branch", gitInfo.branch || "")
    deployUrl.searchParams.set("mainModule", gitInfo.module || "")

    return getOpenInWindowCallback(deployUrl.toString())
  }

  // Otherwise, just direct them to the Streamlit Cloud page.
  return getOpenInWindowCallback(STREAMLIT_CLOUD_URL)
}

export const isLocalhost = (): boolean => {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
}

export interface MenuItemProps {
  item: any
  "aria-selected": boolean
  onClick: (e: MouseEvent<HTMLLIElement>) => void
  onMouseEnter: (e: MouseEvent<HTMLLIElement>) => void
  $disabled: boolean
  $isHighlighted: boolean
}

export interface SubMenuProps {
  menuItems: any[]
  closeMenu: () => void
  isDevMenu: boolean
  metricsMgr: SegmentMetricsManager
}

// BaseWeb provides a very basic list item (or option) for its dropdown
// menus. We want to customize it to our liking. We want to support:
//  * Shortcuts
//  * Red coloring for the stop recording
//  * Dividers (There's no special MenuListItem divider, so items have
//    a hasDividerAbove property to add the border properly.
// Unfortunately, because we are overriding the component, we need to
// implement some of the built in-features, namely:
//  * A11y for selected and disabled
//  * $disabled field (BaseWeb does not use CSS :disabled here)
//  * $isHighlighted field (BaseWeb does not use CSS :hover here)
//  * creating a forward ref to add properties to the DOM element.
function buildMenuItemComponent(
  StyledMenuItemType: typeof StyledCoreItem | typeof StyledDevItem,
  metricsMgr: SegmentMetricsManager
): any {
  const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>(
    (
      {
        item,
        "aria-selected": ariaSelected,
        onClick,
        onMouseEnter,
        $disabled,
        $isHighlighted,
      },
      ref
    ) => {
      const {
        label,
        shortcut,
        hasDividerAbove,
        styleProps,
        noHighlight,
        interactions,
      } = item
      const itemProps = {
        isDisabled: $disabled,
        isRecording: Boolean(item.stopRecordingIndicator),
      }
      const itemStyleProps = {
        isHighlighted: !noHighlight && $isHighlighted,
        styleProps,
      }
      const interactiveProps =
        interactions ||
        ($disabled
          ? {}
          : {
              onClick: (e: MouseEvent<HTMLLIElement>) => {
                metricsMgr.enqueue("menuClick", {
                  label,
                })
                onClick(e)
              },
              onMouseEnter,
            })

      return (
        <>
          {hasDividerAbove && (
            <StyledMenuDivider data-testid="main-menu-divider" />
          )}
          <StyledMenuItem
            ref={ref}
            role="option"
            aria-selected={ariaSelected}
            aria-disabled={$disabled}
            {...itemProps}
            {...interactiveProps}
          >
            <StyledMenuItemType {...itemStyleProps}>
              <StyledMenuItemLabel {...itemProps}>{label}</StyledMenuItemLabel>
              {shortcut && (
                <StyledMenuItemShortcut {...itemProps}>
                  {shortcut}
                </StyledMenuItemShortcut>
              )}
            </StyledMenuItemType>
          </StyledMenuItem>
        </>
      )
    }
  )
  MenuItem.displayName = "MenuItem"
  return MenuItem
}

const SubMenu = (props: SubMenuProps): ReactElement => {
  const { colors }: EmotionTheme = useTheme()
  const StyledMenuItemType = props.isDevMenu ? StyledDevItem : StyledCoreItem
  return (
    <StatefulMenu
      items={props.menuItems}
      onItemSelect={({ item }) => {
        item.onClick()
        props.closeMenu()
      }}
      overrides={{
        Option: buildMenuItemComponent(StyledMenuItemType, props.metricsMgr),
        List: {
          props: {
            "data-testid": "main-menu-list",
          },
          style: {
            backgroundColor: "inherit",
            borderRadius: 0,

            ":focus": {
              outline: "none",
            },
            border: `1px solid ${colors.fadedText10}`,
          },
        },
      }}
    />
  )
}

function getDevMenuItems(
  coreDevMenuItems: Record<string, any>,
  showDeploy: boolean
): any[] {
  const devMenuItems = []
  const preferredDevMenuOrder: any[] = [
    coreDevMenuItems.developerOptions,
    coreDevMenuItems.clearCache,
    showDeploy && coreDevMenuItems.deployApp,
  ]

  let devLastMenuItem = null

  for (const devMenuItem of preferredDevMenuOrder) {
    if (devMenuItem) {
      if (devMenuItem !== coreDevMenuItems.DIVIDER) {
        if (devLastMenuItem === coreDevMenuItems.DIVIDER) {
          devMenuItems.push({ ...devMenuItem, hasDividerAbove: true })
        } else {
          devMenuItems.push(devMenuItem)
        }
      }

      devLastMenuItem = devMenuItem
    }
  }

  if (devLastMenuItem != null) {
    devLastMenuItem.styleProps = {
      margin: "0 0 -.5rem 0",
      padding: ".25rem 0 .25rem 1.5rem",
    }
  }
  return devMenuItems
}

function getPreferredMenuOrder(
  props: Props,
  hostMenuItems: any[],
  coreMenuItems: Record<string, any>
): any[] {
  let preferredMenuOrder: any[]
  if (props.toolbarMode == Config.ToolbarMode.MINIMAL) {
    // If toolbar mode == minimal then show only host menu items if any.
    preferredMenuOrder = [
      coreMenuItems.report,
      coreMenuItems.community,
      coreMenuItems.DIVIDER,
      ...(hostMenuItems.length > 0 ? hostMenuItems : [coreMenuItems.DIVIDER]),
      coreMenuItems.about,
    ]

    preferredMenuOrder = preferredMenuOrder.filter(d => d)
    // If the first or last item is a divider, delete it, because
    // we don't want to start/end the menu with it.
    // TODO(sfc-gh-kbregula): We should use Array#at when supported by
    //  browsers/cypress or transpilers.
    //  See: https://github.com/tc39/proposal-relative-indexing-method
    while (
      preferredMenuOrder.length > 0 &&
      preferredMenuOrder[0] == coreMenuItems.DIVIDER
    ) {
      preferredMenuOrder.shift()
    }
    while (
      preferredMenuOrder.length > 0 &&
      preferredMenuOrder.at(preferredMenuOrder.length - 1) ==
        coreMenuItems.DIVIDER
    ) {
      preferredMenuOrder.pop()
    }
    return preferredMenuOrder
  }
  return [
    coreMenuItems.rerun,
    coreMenuItems.settings,
    coreMenuItems.DIVIDER,
    coreMenuItems.print,
    coreMenuItems.recordScreencast,
    coreMenuItems.DIVIDER,
    coreMenuItems.report,
    coreMenuItems.community,
    ...(hostMenuItems.length > 0 ? hostMenuItems : [coreMenuItems.DIVIDER]),
    coreMenuItems.about,
  ]
}

function MainMenu(props: Props): ReactElement {
  const isServerDisconnected = !props.isServerConnected

  const onClickDeployApp = useCallback((): void => {
    const { showDeployError, isDeployErrorModalOpen, gitInfo, closeDialog } =
      props

    if (!gitInfo) {
      const dialog = NoRepositoryDetected()

      showDeployError(dialog.title, dialog.body)

      return
    }

    const {
      repository,
      branch,
      module,
      untrackedFiles,
      state: gitState,
    } = gitInfo
    const hasMissingGitInfo = !repository || !branch || !module

    if (hasMissingGitInfo && gitState === GitStates.DEFAULT) {
      const dialog = NoRepositoryDetected()

      showDeployError(dialog.title, dialog.body)

      return
    }

    if (gitState === GitStates.HEAD_DETACHED) {
      const dialog = DetachedHead()

      showDeployError(dialog.title, dialog.body)

      return
    }

    if (module && untrackedFiles?.includes(module)) {
      const dialog = ModuleIsNotAdded(module)

      showDeployError(dialog.title, dialog.body)

      return
    }

    // We should close the modal when we try again and everything goes fine
    if (isDeployErrorModalOpen) {
      closeDialog()
    }

    getDeployAppUrl(gitInfo)()
  }, [props])

  useEffect(() => {
    if (!props.gitInfo || !props.isDeployErrorModalOpen) {
      return
    }

    onClickDeployApp()
  }, [props.gitInfo, props.isDeployErrorModalOpen, onClickDeployApp])

  const showAboutMenu =
    props.toolbarMode != Config.ToolbarMode.MINIMAL ||
    (props.toolbarMode == Config.ToolbarMode.MINIMAL &&
      props.menuItems?.aboutSectionMd)

  const coreMenuItems = {
    DIVIDER: { isDivider: true },
    rerun: {
      disabled: isServerDisconnected,
      onClick: props.quickRerunCallback,
      label: "Rerun",
      shortcut: "r",
    },
    print: { onClick: props.printCallback, label: "Print" },
    recordScreencast: {
      onClick: props.screencastCallback,
      label: SCREENCAST_LABEL[props.screenCastState] || "Record a screencast",
      shortcut: SCREENCAST_LABEL[props.screenCastState] ? "esc" : "",
      stopRecordingIndicator: Boolean(SCREENCAST_LABEL[props.screenCastState]),
    },
    saveSnapshot: {
      disabled: isServerDisconnected,
      label: "Save a snapshot",
    },
    ...(!props.menuItems?.hideGetHelp &&
      props.menuItems?.getHelpUrl && {
        community: {
          onClick: getOpenInWindowCallback(props.menuItems?.getHelpUrl),
          label: "Get help",
        },
      }),
    ...(!props.menuItems?.hideReportABug &&
      props.menuItems?.reportABugUrl && {
        report: {
          onClick: getOpenInWindowCallback(props.menuItems?.reportABugUrl),
          label: "Report a bug",
        },
      }),
    settings: { onClick: props.settingsCallback, label: "Settings" },
    ...(showAboutMenu && {
      about: { onClick: props.aboutCallback, label: "About" },
    }),
  }

  const coreDevMenuItems = {
    DIVIDER: { isDivider: true },
    deployApp: {
      onClick: onClickDeployApp,
      label: "Deploy this app",
    },
    developerOptions: {
      label: "Developer options",
      noHighlight: true,
      interactions: {},
      styleProps: {
        fontSize: "0.75rem",
        margin: "-.5rem 0 0 0",
        padding: ".25rem 0 .25rem 1.5rem",
        pointerEvents: "none",
      },
    },
    clearCache: {
      disabled: isServerDisconnected,
      onClick: props.clearCacheCallback,
      label: "Clear cache",
      shortcut: "c",
    },
  }

  const hostMenuItems = props.hostMenuItems.map(item => {
    if (item.type === "separator") {
      return coreMenuItems.DIVIDER
    }

    if (item.key === "reportBug") {
      if (props.menuItems?.hideGetHelp) {
        return null
      }
    }

    if (item.key === "about") {
      if (props.menuItems?.aboutSectionMd !== "") {
        return null
      }
    }

    return {
      onClick: () =>
        props.sendMessageToHost({
          type: "MENU_ITEM_CALLBACK",
          key: item.key,
        }),
      label: item.label,
    }
  }, [] as any[])

  const shouldShowHostMenu = !!hostMenuItems.length
  const showDeploy = isLocalhost() && !shouldShowHostMenu && props.canDeploy
  const preferredMenuOrder = getPreferredMenuOrder(
    props,
    hostMenuItems,
    coreMenuItems
  )

  // Remove empty entries, and add dividers into menu options as needed.
  const menuItems: any[] = []
  let lastMenuItem = null
  for (const menuItem of preferredMenuOrder) {
    if (menuItem) {
      if (menuItem !== coreMenuItems.DIVIDER) {
        if (lastMenuItem === coreMenuItems.DIVIDER) {
          menuItems.push({ ...menuItem, hasDividerAbove: true })
        } else {
          menuItems.push(menuItem)
        }
      }

      lastMenuItem = menuItem
    }
  }

  const devMenuItems: any[] = props.developmentMode
    ? getDevMenuItems(coreDevMenuItems, showDeploy)
    : []

  if (menuItems.length == 0 && devMenuItems.length == 0) {
    // Don't show an empty menu.
    return <></>
  }

  return (
    <StatefulPopover
      focusLock
      onOpen={() => {
        if (showDeploy) {
          props.loadGitInfo()
        }
      }}
      placement={PLACEMENT.bottomRight}
      content={({ close }) => (
        <StyledMenuContainer>
          {menuItems.length != 0 && (
            <SubMenu
              menuItems={menuItems}
              closeMenu={close}
              isDevMenu={false}
              metricsMgr={props.metricsMgr}
            />
          )}
          {devMenuItems.length != 0 && (
            <SubMenu
              menuItems={devMenuItems}
              closeMenu={close}
              isDevMenu={true}
              metricsMgr={props.metricsMgr}
            />
          )}
        </StyledMenuContainer>
      )}
      overrides={{
        Body: {
          props: {
            "data-testid": "main-menu-popover",
          },
        },
      }}
    >
      <StyledMainMenuContainer id="MainMenu">
        <BaseButton kind={BaseButtonKind.HEADER_NO_PADDING}>
          <Icon content={MoreVert} size="lg" />
        </BaseButton>
        {props.screenCastState === "RECORDING" && <StyledRecordingIndicator />}
      </StyledMainMenuContainer>
    </StatefulPopover>
  )
}

export default memo(MainMenu)

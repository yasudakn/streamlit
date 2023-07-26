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

import React from "react"
import "@testing-library/jest-dom"
import {
  screen,
  waitFor,
  fireEvent,
  RenderResult,
  Screen,
} from "@testing-library/react"
import {
  mount,
  render,
  IMenuItem,
  mockSessionInfo,
  Config,
  GitInfo,
  IGitInfo,
} from "@streamlit/lib"

import { IDeployErrorDialog } from "@streamlit/app/src/components/StreamlitDialog/DeployErrorDialogs/types"
import {
  DetachedHead,
  ModuleIsNotAdded,
  NoRepositoryDetected,
} from "@streamlit/app/src/components/StreamlitDialog/DeployErrorDialogs"
import { SegmentMetricsManager } from "@streamlit/app/src/SegmentMetricsManager"

import MainMenu, { Props } from "./MainMenu"

const { GitStates } = GitInfo

const getProps = (extend?: Partial<Props>): Props => ({
  aboutCallback: jest.fn(),
  printCallback: jest.fn(),
  clearCacheCallback: jest.fn(),
  isServerConnected: true,
  quickRerunCallback: jest.fn(),
  hostMenuItems: [],
  screencastCallback: jest.fn(),
  screenCastState: "",
  sendMessageToHost: jest.fn(),
  settingsCallback: jest.fn(),
  isDeployErrorModalOpen: false,
  showDeployError: jest.fn(),
  loadGitInfo: jest.fn(),
  closeDialog: jest.fn(),
  canDeploy: true,
  menuItems: {},
  developmentMode: true,
  gitInfo: null,
  metricsMgr: new SegmentMetricsManager(mockSessionInfo()),
  toolbarMode: Config.ToolbarMode.AUTO,
  ...extend,
})

async function openMenu(screen: Screen): Promise<void> {
  fireEvent.click(screen.getByRole("button"))
  // Each SubMenu is a listbox, so need to use findAllByRole (findByRole throws error if multiple matches)
  const menu = await screen.findAllByRole("listbox")
  expect(menu).toBeDefined()
}

function getMenuStructure(
  renderResult: RenderResult
): ({ type: "separator" } | { type: "option"; label: string })[][] {
  return Array.from(
    renderResult.baseElement.querySelectorAll('[role="listbox"]')
  ).map(listBoxElement => {
    return Array.from(
      listBoxElement.querySelectorAll(
        '[role=option] span:first-of-type, [data-testid="main-menu-divider"]'
      )
    ).map(d =>
      d.getAttribute("data-testid") == "main-menu-divider"
        ? { type: "separator" }
        : { type: "option", label: d.textContent as string }
    )
  })
}

describe("MainMenu", () => {
  it("renders without crashing", () => {
    const props = getProps()
    const wrapper = mount(<MainMenu {...props} />)

    expect(wrapper).toBeDefined()
  })

  it("should render host menu items", async () => {
    const items: IMenuItem[] = [
      {
        type: "separator",
      },
      {
        type: "text",
        label: "View app source",
        key: "source",
      },
      {
        type: "text",
        label: "Report bug with app",
        key: "support",
      },
      {
        type: "separator",
      },
    ]
    const props = getProps({
      hostMenuItems: items,
    })
    render(<MainMenu {...props} />)
    await openMenu(screen)

    const menuOptions = await screen.findAllByRole("option")

    const expectedLabels = [
      "Rerun",
      "Settings",
      "Print",
      "Record a screencast",
      "View app source",
      "Report bug with app",
      "About",
      "Developer options",
      "Clear cache",
    ]

    expectedLabels.forEach((label, index) => {
      expect(menuOptions[index]).toHaveTextContent(label)
    })
  })

  it("should render core set of menu elements", async () => {
    const props = getProps()
    render(<MainMenu {...props} />)
    await openMenu(screen)

    const menuOptions = await screen.findAllByRole("option")

    const expectedLabels = [
      "Rerun",
      "Settings",
      "Print",
      "Record a screencast",
      "About",
      "Developer options",
      "Clear cache",
      "Deploy this app",
    ]

    expectedLabels.forEach((label, index) => {
      expect(menuOptions[index]).toHaveTextContent(label)
    })
  })

  it("should render deploy app menu item", async () => {
    const props = getProps({ gitInfo: {} })
    render(<MainMenu {...props} />)
    await openMenu(screen)

    const menu = await screen.findByRole("option", {
      name: "Deploy this app",
    })
    expect(menu).toBeDefined()
  })

  describe("Onclick deploy button", () => {
    function testDeployErrorModal(
      gitInfo: Partial<IGitInfo>,
      dialogComponent: (module: string) => IDeployErrorDialog
    ): void {
      const props = getProps({
        gitInfo,
      })
      const wrapper = mount(<MainMenu {...props} />)
      const popoverContent = wrapper.find("StatefulPopover").prop("content")

      // @ts-expect-error
      const menuWrapper = mount(popoverContent(() => {}))
      const items: any = menuWrapper.find("StatefulMenu").at(1).prop("items")

      const deployOption = items.find(
        ({ label }) => label === "Deploy this app"
      )

      deployOption.onClick()

      // @ts-expect-error
      const dialog = dialogComponent(props.gitInfo.module)
      // @ts-expect-error
      expect(props.showDeployError.mock.calls[0][0]).toStrictEqual(
        dialog.title
      )
      // @ts-expect-error
      expect(props.showDeployError.mock.calls[0][1]).toStrictEqual(dialog.body)
    }

    // eslint-disable-next-line jest/expect-expect -- underlying testDeployErrorModal function has expect statements
    it("should display the correct modal if there is no repo or remote", () => {
      testDeployErrorModal(
        {
          state: GitStates.DEFAULT,
        },
        NoRepositoryDetected
      )
    })

    // eslint-disable-next-line jest/expect-expect
    it("should display the correct modal if there is an empty repo", () => {
      testDeployErrorModal(
        {
          repository: "",
          branch: "",
          module: "",
          state: GitStates.DEFAULT,
        },
        NoRepositoryDetected
      )
    })

    // eslint-disable-next-line jest/expect-expect
    it("should display the correct modal if the repo is detached", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module",
          state: GitStates.HEAD_DETACHED,
        },
        DetachedHead
      )
    })

    // eslint-disable-next-line jest/expect-expect
    it("should display the correct modal if the script is not added to the repo", () => {
      testDeployErrorModal(
        {
          repository: "repo",
          branch: "branch",
          module: "module.py",
          state: GitStates.DEFAULT,
          untrackedFiles: ["module.py"],
        },
        ModuleIsNotAdded
      )
    })
  })

  it("should not render set of configurable elements", () => {
    const menuItems = {
      hideGetHelp: true,
      hideReportABug: true,
      aboutSectionMd: "",
    }
    const props = getProps({ menuItems })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-expect-error
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-expect-error
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      .at(0)
      .prop("items")
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Print",
      "Record a screencast",
      "About",
    ])
  })

  it("should not render report a bug in core menu", async () => {
    const menuItems = {
      getHelpUrl: "testing",
      hideGetHelp: false,
      hideReportABug: true,
      aboutSectionMd: "",
    }
    const props = getProps({ menuItems })
    render(<MainMenu {...props} />)
    await openMenu(screen)

    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Report a bug" })).toBeNull()
    )
  })

  it("should render report a bug in core menu", async () => {
    const menuItems = {
      reportABugUrl: "testing",
      hideGetHelp: false,
      hideReportABug: false,
      aboutSectionMd: "",
    }
    const props = getProps({ menuItems })
    render(<MainMenu {...props} />)
    await openMenu(screen)

    const reportOption = await screen.findByRole("option", {
      name: "Report a bug",
    })
    expect(reportOption).toBeDefined()
  })

  it("should not render dev menu when developmentMode is false", () => {
    const props = getProps({ developmentMode: false })
    const wrapper = mount(<MainMenu {...props} />)
    const popoverContent = wrapper.find("StatefulPopover").prop("content")
    // @ts-expect-error
    const menuWrapper = mount(popoverContent(() => {}))

    // @ts-expect-error
    const menuLabels = menuWrapper
      .find("MenuStatefulContainer")
      // make sure that we only have one menu otherwise prop will fail
      .prop("items")
      .map(item => item.label)
    expect(menuLabels).toEqual([
      "Rerun",
      "Settings",
      "Print",
      "Record a screencast",
      "About",
    ])
  })

  it.each([
    [Config.ToolbarMode.AUTO],
    [Config.ToolbarMode.DEVELOPER],
    [Config.ToolbarMode.VIEWER],
    [Config.ToolbarMode.MINIMAL],
  ])("should render host menu items if available[%s]", async toolbarMode => {
    const props = getProps({
      toolbarMode,
      hostMenuItems: [
        { label: "Host menu item", key: "host-item", type: "text" },
      ],
    })
    const view = render(<MainMenu {...props} />)
    await openMenu(screen)

    const menuStructure = getMenuStructure(view)
    expect(menuStructure[0]).toContainEqual({
      type: "option",
      label: "Host menu item",
    })
  })

  it("should hide main menu when toolbarMode is Minimal and no host items", async () => {
    const props = getProps({
      developmentMode: false,
      toolbarMode: Config.ToolbarMode.MINIMAL,
      hostMenuItems: [],
    })

    render(<MainMenu {...props} />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("should skip divider from host menu items if it is at the beginning and end", async () => {
    const props = getProps({
      developmentMode: false,
      toolbarMode: Config.ToolbarMode.MINIMAL,
      hostMenuItems: [
        { type: "separator" },
        { type: "text", label: "View all apps", key: "viewAllApps" },
        { type: "separator" },
        { type: "text", label: "About Streamlit Cloud", key: "about" },
        { type: "separator" },
      ],
    })
    const view = render(<MainMenu {...props} />)
    await openMenu(screen)

    const menuStructure = getMenuStructure(view)
    expect(menuStructure).toEqual([
      [{ type: "option", label: "View all apps" }],
    ])
  })

  it.each([
    [
      ["getHelpUrl", "reportABugUrl", "aboutSectionMd"],
      [
        {
          label: "Report a bug",
          type: "option",
        },
        {
          label: "Get help",
          type: "option",
        },
        {
          type: "separator",
        },
        {
          label: "About",
          type: "option",
        },
      ],
    ],
    [
      ["getHelpUrl"],
      [
        {
          label: "Get help",
          type: "option",
        },
      ],
    ],
    [
      ["reportABugUrl"],
      [
        {
          label: "Report a bug",
          type: "option",
        },
      ],
    ],
    [
      ["aboutSectionMd"],
      [
        {
          label: "About",
          type: "option",
        },
      ],
    ],
  ])(
    "should render custom items in minimal mode[%s]",
    async (menuItems, expectedMenuItems) => {
      const allMenuItems = {
        getHelpUrl: "https://www.extremelycoolapp.com/help",
        reportABugUrl: "https://www.extremelycoolapp.com/bug",
        aboutSectionMd: "# This is a header. This is an *extremely* cool app!",
      }
      const props = getProps({
        developmentMode: false,
        toolbarMode: Config.ToolbarMode.MINIMAL,
        menuItems: Object.fromEntries(
          Object.entries(allMenuItems).filter(d => menuItems.includes(d[0]))
        ),
      })

      const view = render(<MainMenu {...props} />)
      await openMenu(screen)

      const menuStructure = getMenuStructure(view)
      expect(menuStructure).toEqual([expectedMenuItems])
    }
  )

  it("should render host menu items and custom items in minimal mode", async () => {
    const props = getProps({
      developmentMode: false,
      toolbarMode: Config.ToolbarMode.MINIMAL,
      hostMenuItems: [
        { type: "separator" },
        { type: "text", label: "View all apps", key: "viewAllApps" },
        { type: "separator" },
        { type: "text", label: "About Streamlit Cloud", key: "about" },
        { type: "separator" },
      ],
      menuItems: {
        getHelpUrl: "https://www.extremelycoolapp.com/help",
        reportABugUrl: "https://www.extremelycoolapp.com/bug",
        aboutSectionMd: "# This is a header. This is an *extremely* cool app!",
      },
    })
    const view = render(<MainMenu {...props} />)
    await openMenu(screen)

    const menuStructure = getMenuStructure(view)
    expect(menuStructure).toEqual([
      [
        {
          label: "Report a bug",
          type: "option",
        },
        {
          label: "Get help",
          type: "option",
        },
        {
          type: "separator",
        },
        {
          label: "View all apps",
          type: "option",
        },
        {
          type: "separator",
        },
        {
          label: "About",
          type: "option",
        },
      ],
    ])
  })
})

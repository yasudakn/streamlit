/**
 * @license
 * Copyright 2018-2022 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe("st.multiselect", () => {
  beforeEach(() => {
    cy.loadApp("http://localhost:3000/");

    cy.prepForElementSnapshots();
  });

  describe("when first loaded", () => {
    it("should show widget correctly", () => {
      cy.get(".stMultiSelect").should("have.length", 9);

      cy.get(".stMultiSelect").each((el, idx) => {
        return cy.wrap(el).matchThemedSnapshots("multiselect" + idx);
      });
    });

    it("should show the correct text", () => {
      cy.get("[data-testid='stText']")
        .should("have.length", 10)
        .should(
          "have.text",
          "value 1: []" +
            "value 2: []" +
            "value 3: []" +
            "value 4: ['tea', 'water']" +
            "value 5: []" +
            "value 6: []" +
            "value 7: ['Colors.yellow']" +
            "value 8: ['Shake.CHOCOLATE']" +
            "value 9: []" +
            "multiselect changed: False"
        );
    });

    describe("when there are valid options", () => {
      it("should show the correct placeholder", () => {
        cy.get(".stMultiSelect")
          .first()
          .should("have.text", "multiselect 1Choose an optionopen");
      });
    });
    describe("when there are no valid options", () => {
      it("should show the correct placeholder", () => {
        cy.getIndexed(".stMultiSelect", 2).should(
          "have.text",
          "multiselect 3No options to select.open"
        );
      });
    });
  });

  describe("when clicking on the input", () => {
    it("should show values correctly in the dropdown menu", () => {
      cy.getIndexed(".stMultiSelect", 0).then(el => {
        return cy
          .wrap(el)
          .find("input")
          .click()
          .get("li")
          .should("have.length", 2)
          .should("have.text", "malefemale")
          .each((el, idx) => {
            return cy
              .wrap(el)
              .matchImageSnapshot("multiselect-dropdown-" + idx);
          });
      });
    });
    it("should show long values correctly (with ellipses) in the dropdown menu", () => {
      cy.getIndexed(".stMultiSelect", 4).then(el => {
        return cy
          .wrap(el)
          .find("input")
          .click()
          .get("li")
          .should("have.length", 5)
          .each((el, idx) => {
            return cy
              .wrap(el)
              .matchImageSnapshot("multiselect-dropdown-long-label-" + idx);
          });
      });
    });
  });

  function selectOption(idx) {
    cy.get(".stMultiSelect")
      .should("have.length", 9)
      .eq(1)
      .find("input")
      .click();
    cy.getIndexed("li", idx).click();
  }

  describe("when the user makes a selection", () => {
    beforeEach(() => selectOption(1));

    it("sets the value correctly", () => {
      cy.getIndexed(".stMultiSelect span", 1).should("have.text", "Female");

      // Wait for 'data-stale' attr to go away, so the snapshot looks right.
      cy.getIndexed(".stMultiSelect", 1)
        .parent()
        .should("have.attr", "data-stale", "false")
        .invoke("css", "opacity", "1");

      cy.getIndexed(
        ".stMultiSelect",
        1
      ).matchThemedSnapshots("multiselect-selection", { focus: "input" });
    });

    it("outputs the correct value", () => {
      cy.get("[data-testid='stText']")
        .should("have.length", 10)
        .should(
          "have.text",
          "value 1: []" +
            "value 2: ['female']" +
            "value 3: []" +
            "value 4: ['tea', 'water']" +
            "value 5: []" +
            "value 6: []" +
            "value 7: ['Colors.yellow']" +
            "value 8: ['Shake.CHOCOLATE']" +
            "value 9: []" +
            "multiselect changed: False"
        );
    });

    describe("when the user picks a second option", () => {
      beforeEach(() => selectOption(0));

      it("outputs the correct value", () => {
        cy.get("[data-testid='stText']")
          .should("have.length", 10)
          .should(
            "have.text",
            "value 1: []" +
              "value 2: ['female', 'male']" +
              "value 3: []" +
              "value 4: ['tea', 'water']" +
              "value 5: []" +
              "value 6: []" +
              "value 7: ['Colors.yellow']" +
              "value 8: ['Shake.CHOCOLATE']" +
              "value 9: []" +
              "multiselect changed: False"
          );
      });

      describe("when the user deselects the first option", () => {
        beforeEach(() => {
          // this is the 'close button' element for 'Male'
          cy.get('.stMultiSelect span[data-baseweb="tag"] span:last-child')
            .eq(0)
            .click();

          // this the 'close button' element for 'Shake.Vanilla'
          cy.get('.stMultiSelect span[data-baseweb="tag"] span:last-child')
            .eq(2)
            .click();
        });
        it("outputs the correct value", () => {
          cy.get("[data-testid='stText']")
            .should("have.length", 10)
            .should(
              "have.text",
              "value 1: []" +
                "value 2: ['male']" +
                "value 3: []" +
                "value 4: ['tea']" +
                "value 5: []" +
                "value 6: []" +
                "value 7: ['Colors.yellow']" +
                "value 8: ['Shake.CHOCOLATE']" +
                "value 9: []" +
                "multiselect changed: False"
            );
        });
      });

      describe("when the user click the clear button", () => {
        beforeEach(() => {
          cy.get('.stMultiSelect [role="button"][aria-label="Clear all"]')
            .eq(0)
            .click();
          cy.get('.stMultiSelect [role="button"][aria-label="Clear all"]')
            .eq(1)
            .click();
        });
        it("outputs the correct value", () => {
          cy.get("[data-testid='stText']")
            .should("have.length", 10)
            .should(
              "have.text",
              "value 1: []" +
                "value 2: []" +
                "value 3: []" +
                "value 4: ['tea', 'water']" +
                "value 5: []" +
                "value 6: []" +
                "value 7: []" +
                "value 8: ['Shake.CHOCOLATE']" +
                "value 9: []" +
                "multiselect changed: False"
            );
        });
      });
    });

    it("calls callback if one is registered", () => {
      cy.get(".stMultiSelect")
        .should("have.length", 9)
        .last()
        .find("input")
        .click();
      cy.get("li")
        .first()
        .click();

      cy.get("[data-testid='stText']")
        .should("have.length", 10)
        .should(
          "have.text",
          "value 1: []" +
            "value 2: ['female']" +
            "value 3: []" +
            "value 4: ['tea', 'water']" +
            "value 5: []" +
            "value 6: []" +
            "value 7: ['Colors.yellow']" +
            "value 8: ['Shake.CHOCOLATE']" +
            "value 9: ['male']" +
            "multiselect changed: True"
        );
    });
  });
});

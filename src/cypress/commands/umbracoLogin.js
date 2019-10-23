import CommandBase from "./commandBase";

export default class UmbracoLogin extends CommandBase {
  commandName = 'umbracoLogin';

  method(username, password) {
    const cy = this.cy;
    cy.clearCookies();
    cy.clearLocalStorage();

    return cy.request({
      method: 'POST',
      url: this.relativeBackOfficePath + '/backoffice/UmbracoApi/Authentication/PostLogin',
      followRedirect: false,
      body: {
        username: username,
        password: password,
      },
      headers: {
        contentType: "application/json"
      }
    }).then((response) => {
      cy.visit(this.relativeBackOfficePath + '/').then($page => {
        cy.log("$page", $page);
      });

      cy.get('body').should($body => {
        if ($body.hasClass('umb-tour-is-visible')) {
          cy.get('.umb-tour-step__close').click();
        }
      });
    });
  }
}



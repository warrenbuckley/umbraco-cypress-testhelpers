/// <reference types="Cypress" />
import {  FormBuilder,           
          FormModel,
          SendEmailRazorWorkflow,
          CheckboxField,
          ShortAnswerField,
          LongAnswerField,
          PasswordField,
          DateField,
          Workflow,
          SaveAsUmbracoContentNodeWorkflow,         
          SendEmailRazorModel,         
          AliasHelper,
          CmsDocumentType,
          TextBoxProperty,
          FormPickerProperty,          
          DropDownProperty,                 
          DropDownField,
          SaveAsUmbracoContentNodeWorkflowModel,          
          FileUploadField,          
          TemplateBuilderHelper,
          FormBuilderHelper,
          PrevalueSourcesBuilderHelper,
          DataTypesBuilderHelper,
          DocumentTypeBuilderHelper,
          ContentBuilderHelper
        } from '../../../src';
import faker from 'faker';


context('Forms', () => {
  
  const formBuilderHelper: FormBuilderHelper = new FormBuilderHelper();  
  const dataTypesBuilderHelper: DataTypesBuilderHelper = new DataTypesBuilderHelper();
  const templateBuilderHelper: TemplateBuilderHelper = new TemplateBuilderHelper();
  const documentTypeBuilderHelper: DocumentTypeBuilderHelper  = new DocumentTypeBuilderHelper();
  const contentBuilderHelper: ContentBuilderHelper = new ContentBuilderHelper();
  const prevalueSourcesBuilder: PrevalueSourcesBuilderHelper = new PrevalueSourcesBuilderHelper();    
  beforeEach(() => {
    cy.umbracoLogin(Cypress.env('username'), Cypress.env('password'));
  });
  after(() => {
    cy.umbracoLogin(Cypress.env('username'), Cypress.env('password'));
    formBuilderHelper.cleanUp({});
    prevalueSourcesBuilder.cleanUp();
  });

  it('Field actions can cancel and delete', () => {
    const formModel: FormModel = { name: `${formBuilderHelper.formPrefix}${faker.random.uuid()}`};
    const shortAnswerFields: ShortAnswerField[] = [new ShortAnswerField(faker.random.uuid(), faker.lorem.sentence())];

    formBuilderHelper.insert(formBuilderHelper.build({formModel, shortAnswerFields})).then((formbody) => {
      cy.visit(`/umbraco/#/forms/form/edit/${formbody.id}`);
      // Cancel
      cy.dataUmb('delete_0_0_0').click();
      cy.dataUmb('confirm_0_0_0').children().last().click();
      cy.dataUmb('field_name_0_0_0').should('exist');
      // Delete
      cy.dataUmb('delete_0_0_0').click();
      cy.dataUmb('confirm_0_0_0').children().first().click();
      cy.get('field_name_0_0_0').should('not.exist');
    });
  });

 
  it('Required field values can not be empty', () => {
    const formModel: FormModel = { name: `${formBuilderHelper.formPrefix}${faker.random.uuid()}`};
    formBuilderHelper.insert(formBuilderHelper.build({formModel})).then((formbody) => {
      cy.visit(`/umbraco/#/forms/form/edit/${formbody.id}`);
      cy.get('field-setting-editor').should('not.exist');
      cy.dataUmb('forms-add-question').click();
      cy.dataUmb('field-settings-submit').click();
      // Test that the dialog didn't close
      cy.dataUmb('field-setting-editor').should('exist');
      // Fill out some values
      cy.dataUmb('field-settings-enter-question').type(faker.random.word()).blur();
      cy.dataUmb('field-settings-submit').click();
      // Test that the dialog didn't close
      cy.dataUmb('field-setting-editor').should('exist');
      cy.dataUmb('field-settings-choose-answer-type').click();
      cy.dataUmb('field-type-picker-fieldType_0').click();
      cy.dataUmb('field-settings-submit').click();
      // Test that the dialog closed
      cy.dataUmb('field-setting-editor').should('not.exist');

    });
  });
  it('Test form submitting and run workflow send email with template (Razor)', () => {
    /******************* SETUP  /********************/
    /* CMS */
    const documentTypeName = `${formBuilderHelper.docTypePrefix}${faker.random.uuid()}`;    
    const documentType=new CmsDocumentType(documentTypeName,AliasHelper.uuidToAlias(documentTypeName));  
    
    const textBoxPropertyName1= `${formBuilderHelper.dataTypePrefix}${faker.random.uuid()}`;
    const textBoxProperty1= new TextBoxProperty(textBoxPropertyName1, AliasHelper.uuidToAlias(textBoxPropertyName1), 100,'Page title'); 
    const textBoxPropertyName2= `${formBuilderHelper.dataTypePrefix}${faker.random.uuid()}`;
    const textBoxProperty2= new TextBoxProperty(textBoxPropertyName2, AliasHelper.uuidToAlias(textBoxPropertyName2),100,'Your name?'); 

    const textBoxProperties=[textBoxProperty1,textBoxProperty2];

    const dropDownPropertyName1 =`${formBuilderHelper.dataTypePrefix}${faker.random.uuid()}`;
    const dropDownProperty1 = new DropDownProperty(dropDownPropertyName1, AliasHelper.uuidToAlias(dropDownPropertyName1),true,['value1','value2','value3','value4','value5']);    
    const dropDownProperties=[dropDownProperty1];   
    
    const formPickerProperty = new FormPickerProperty(`${formBuilderHelper.dataTypePrefix}${faker.random.uuid()}`,'MyFormPicker','',[]);                              
    /* CMS */
    /* Forms */    
    const formModel: FormModel = { name: `${formBuilderHelper.formPrefix}${faker.random.uuid()}`};    
    const firstName =`${faker.random.uuid()}`;
    const lastName = `${faker.random.uuid()}`;
    const shortAnswerFields: ShortAnswerField[] = [
      new ShortAnswerField(faker.random.uuid(), 'shortanswer', 'shortanswer', faker.lorem.sentence()),
      new ShortAnswerField(faker.random.uuid(), 'email', 'Email' ),
      new ShortAnswerField(faker.random.uuid(), 'Email address', 'emailAddress' ),
      new ShortAnswerField(faker.random.uuid(), 'phone', 'phoneNumber' ),
      //https://github.com/umbraco/Umbraco.Forms.Issues/issues/52
      //Fields marked as sensitive is included in emails 
      new ShortAnswerField(faker.random.uuid(),'sensitiveData', 'Sensitive', null, true ),
      new ShortAnswerField(firstName, 'firstName', 'First name'),
      new ShortAnswerField(lastName, 'lastName', 'Last name')
    ];    

    const longAnswerFields: LongAnswerField[] = [new LongAnswerField(faker.random.uuid(), 'longanswer', 'longanswer', faker.lorem.sentence())];
    const passwordFields: PasswordField[] = [ new PasswordField(faker.random.uuid(), 'password', 'Password', faker.random.alphaNumeric(12))];
    const checkboxFields: CheckboxField[] = [ new CheckboxField(faker.random.uuid())];
    const dateFields: DateField[] = [ new DateField(faker.random.uuid())];    
    const dropDownFields: DropDownField[] = [new DropDownField(faker.random.uuid())];
    const uploadFieldName = faker.random.uuid();
    const uploadFields = [ new FileUploadField(uploadFieldName)];

    const razorSendEmailRazorModel = new SendEmailRazorModel(formModel.name);    
    razorSendEmailRazorModel.email ='{email}';
    razorSendEmailRazorModel.senderEmail='{emailAddress}';
    razorSendEmailRazorModel.subject = `Test {phone} {phonenumber} {eMAILAddREss} {EMail} {emailAddress} [#pageTitle] [@Url] [$${textBoxPropertyName1}] [%dismissAvatar]`;
    
    const fileName = 'prevalueSourceFile.txt';

    const saveAsUmbracoContentNodeWorkflowName = faker.random.uuid();
    const saveAsUmbracoContentNodeWorkflowModel = new SaveAsUmbracoContentNodeWorkflowModel(saveAsUmbracoContentNodeWorkflowName);

    const workflows: Workflow[] =[
      new SendEmailRazorWorkflow().getWorkflow(razorSendEmailRazorModel),
      new SaveAsUmbracoContentNodeWorkflow().getWorkflow(saveAsUmbracoContentNodeWorkflowModel)
    ];

    const formPickerTemplateName = `${formBuilderHelper.templatePrefix}${faker.random.uuid()}`;          
    const formPickerTemplate = templateBuilderHelper.buildFormPickerTemplate(formPickerTemplateName,AliasHelper.uuidToAlias(formPickerTemplateName),'MyFormPicker',documentType.alias,textBoxProperties);     
    /* Forms */    
    
    /* Build and post*/
    dataTypesBuilderHelper.insert(textBoxProperties,dropDownProperties,formPickerProperty).then((result: {dataType,property}[])=>{ 
      templateBuilderHelper.insert(formPickerTemplate).then(template=>{
        const builder=documentTypeBuilderHelper.build(documentType,template,result);      
        documentTypeBuilderHelper.insert(builder).then(docType=>{  
          // Get the id of the dropdown datatype
          const index=result.findIndex(p=>p.property.name===dropDownPropertyName1);
          prevalueSourcesBuilder.insertDataTypePrevalue(faker.random.word(), result[index].dataType.id).then(prevalueSource=>{            
            dropDownFields[0].prevalueSourceId = prevalueSource.id;
            
            const formBuild=formBuilderHelper.build({formModel, workflows,shortAnswerFields,longAnswerFields,passwordFields,checkboxFields,dateFields,dropDownFields,uploadFields});
            
            formBuilderHelper.insert(formBuild).then(formBody=>{
              
              formPickerProperty.value = formBody.id;
              contentBuilderHelper.insert(template,docType,result.map(p=>p.property)).then(response=>{    
    /******************* END SETUP  /********************/      
    /******************* START TEST  /********************/          
                  // Test https://github.com/umbraco/Umbraco.Forms.Issues/issues/299
                  // Saving a form field with prevalues like dropdown to a responding document property editor throws exception
                  // Setup the save as umbraco content node workflow
                  cy.visit(`/umbraco/#/forms/form/edit/${formBody.id}`).then(p=>{
                    cy.dataUmb(saveAsUmbracoContentNodeWorkflowName).click();                    
                    cy.dataUmb('documentmapper').select(docType.name);                  
                    cy.dataUmb('select_form_field').first().select(dropDownFields[0].id)
                    cy.dataUmb('choose_a_root_node').click();
                    cy.server();
                    cy.route(`/umbraco/backoffice/UmbracoTrees/ApplicationTree/GetApplicationTrees?application=content&tree=content&use=dialog`).as('wait');                                      
                    cy.wait('@wait').its('status').should('be', 200);  
                    // Pick Document type
                    
                    cy.get('a').contains(response.variants[0].name).click();                   
                   
                    cy.get('.ng-valid-required.ng-valid-parse > .umb-panel > .umb-editor-footer > .umb-editor-footer-content > .umb-editor-footer-content__right-side > [button-style="success"] > .umb-button > .btn > .umb-button__content').click();
                    // Save form                  
                    
                    cy.contains('Save').parent().click();
                    // End test https://github.com/umbraco/Umbraco.Forms.Issues/issues/299
                  })
                  // Create two form entry                                    
                  for(let i=0;i<2;i++){
                    cy.visit(response.urls[0].text).then(()=>{
                      cy.dataUmb(shortAnswerFields[0].id).should('be.visible');
                      cy.dataUmb(longAnswerFields[0].id).should('be.visible');
                      cy.dataUmb(passwordFields[0].id).should('be.visible');
                      cy.dataUmb(checkboxFields[0].id).should('be.visible');
                      cy.dataUmb(dateFields[0].id).should('not.be.visible');

                      // Short answer
                      cy.dataUmb(shortAnswerFields[0].id).type(shortAnswerFields[0].value).blur();
                      cy.dataUmb(firstName).type(faker.random.word());
                      cy.dataUmb(lastName).type(faker.random.word());

                      // Long answer
                      cy.dataUmb(longAnswerFields[0].id).type(longAnswerFields[0].value).blur();

                      // Password
                      cy.dataUmb(passwordFields[0].id).type(passwordFields[0].value).blur();

                      // Checkbox
                      cy.dataUmb(checkboxFields[0].id).check();

                      // Date
                      cy.dataUmb(`${dateFields[0].id}_1`).focus();
                      cy.get("div.pika-lendar").should('be.visible');
                      cy.get(".pika-button.pika-day").first().click();
                      cy.get("div.pika-lendar").should('not.be.visible');

                      cy.dataUmb(shortAnswerFields[1].id).type(faker.internet.email());
                      cy.dataUmb(shortAnswerFields[2].id).type(faker.internet.email());
                      cy.dataUmb(shortAnswerFields[3].id).type(`${faker.phone.phoneNumber()}`);
                      cy.dataUmb(shortAnswerFields[4].id).type(`Sensitive word: ${faker.random.word()}`);
                      
                      // Dropdown
                      cy.dataUmb(dropDownFields[0].id).select(dropDownProperties[0].values[faker.random.number({min: 0, max:4})]);

                      // Upload file
                      cy.dataUmb(uploadFields[0].id).should('be.visible');
                      
                      cy.fixture(fileName).then(fileContent => {
                        cy.dataUmb(uploadFields[0].id).upload({ fileContent, fileName, mimeType: 'application/json' });

                        // Submit
                        cy.get('form').submit();

                        // Thank you message
                        cy.get('.umbraco-forms-submitmessage').should('be.visible');
                      });
                    });
                  }
                 

                  // Test https://github.com/umbraco/Umbraco.Forms.Issues/issues/305
                  // Can't remove Entry when fields in Form have changed
                  cy.visit(`/umbraco/#/forms/form/edit/${formBody.id}`).wait(3000).then(p=>{
                    // Get last name
                    cy.dataUmb('delete_0_6_6').click();
                    cy.dataUmb('confirm_6_6_6').children().first().click();
                    cy.contains('Last name').should('not.exist');
                    cy.contains('Save').parent().click();                    
                  });
                  cy.visit(`/umbraco/#/forms/form/entries/${formBody.id}`).wait(3000).then(p=>{
                    cy.dataUmb('record_entry_0','a').first().click();
                    cy.contains(fileName.toLowerCase());   
                    cy.dataUmb('label_Lastname').should('not.exist');
                    // End test https://github.com/umbraco/Umbraco.Forms.Issues/issues/305
                    
                    // General test                    
                    // Verify field values
                    cy.dataUmb('label_shortanswer').should('have.text', shortAnswerFields[0].caption);
                    cy.dataUmb(`${shortAnswerFields[0].alias}`).should('contain.text', shortAnswerFields[0].value);

                    cy.dataUmb(`label_${longAnswerFields[0].alias}`).should('have.text', longAnswerFields[0].caption);
                    cy.dataUmb(`${longAnswerFields[0].alias}`).should('contain.text', longAnswerFields[0].value);

                    cy.dataUmb('label_' + checkboxFields[0].id).should('have.text', checkboxFields[0].id);
                    cy.dataUmb(checkboxFields[0].id).should('contain.text', "True");

                    cy.dataUmb('label_' + dateFields[0].id).should('have.text', dateFields[0].id);
                    const d = new Date();
                    const datestring = (d.getMonth() + 1) + "/" + 1 + "/" + d.getFullYear() + " 12:00:00 AM";
                    cy.dataUmb(dateFields[0].id).should('contain.text', datestring + '\n');

                  });                                                     

                  cy.visit('/umbraco/#/forms/form/edit/' + formBody.id).wait(3000).then(p=>{
                    // Verify that the workflow is attached
                    cy.dataUmb(formModel.name).should('have.text', formModel.name);
                  });
              });              
            });
          });
        });
      });          
    });               
  });
  
  
 
  
    it.skip('Test HideAll Contains conditions', () => {
      const text1ToInsert = 'test';
      const text2ToInsert = 'asdasd';
      const shortAnswer1Id = faker.random.uuid();
      const shortAnswer2Id = faker.random.uuid();
      const shortAnswer3Id = faker.random.uuid();
      const formModel: FormModel = { name: `${this.form.formPrefix}${faker.random.uuid()}`};     
      const form = new FormBuilder()
        .withName(formModel.name)
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer1Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer2Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer3Id)
        .addHideAllConditions()
        .addRule()
        .withContainsRule(shortAnswer1Id, text1ToInsert)
        .withContainsRule(shortAnswer2Id, text2ToInsert)
        .done()
        .done()
        .done()
        .done()
        .done()
        .done()
        .build();

      form.insertFormOnPage({ form }).then(() => {
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
        cy.get("input[name='" + shortAnswer1Id + "']").type(text1ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
        cy.get("input[name='" + shortAnswer2Id + "']").type(text2ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
      });
    });

    it.skip('Test HideAny Contains conditions', () => {
      const text1ToInsert = 'test';
      const text2ToInsert = 'asdasd';
      const shortAnswer1Id = faker.random.uuid();
      const shortAnswer2Id = faker.random.uuid();
      const shortAnswer3Id = faker.random.uuid();
      const formModel: FormModel = { name: `${this.form.formPrefix}${faker.random.uuid()}`};     
      const form = new FormBuilder()
      .withName(formModel.name)
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer1Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer2Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer3Id)
        .addHideAnyConditions()
        .addRule()
        .withContainsRule(shortAnswer1Id, text1ToInsert)
        .withContainsRule(shortAnswer2Id, text2ToInsert)
        .done()
        .done()
        .done()
        .done()
        .done()
        .done()
        .build();

      form.insertFormOnPage(form).then(() => {
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
        cy.get("input[name='" + shortAnswer1Id + "']").type(text1ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
        cy.get("input[name='" + shortAnswer2Id + "']").type(text2ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
      });
    });

    it.skip('Test ShowAll Contains condition', () => {
      const text1ToInsert = 'test';
      const text2ToInsert = 'asdasd';
      const shortAnswer1Id = faker.random.uuid();
      const shortAnswer2Id = faker.random.uuid();
      const shortAnswer3Id = faker.random.uuid();
      const formModel: FormModel = { name: `${this.form.formPrefix}${faker.random.uuid()}`}; 
      const form = new FormBuilder()
      .withName(formModel.name)
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer1Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer2Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer3Id)
        .addShowAllConditions()
        .addRule()
        .withContainsRule(shortAnswer1Id, text1ToInsert)
        .withContainsRule(shortAnswer2Id, text2ToInsert)
        .done()
        .done()
        .done()
        .done()
        .done()
        .done()
        .build();

      form.insertFormOnPage({ form }).then(() => {
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
        cy.get("input[name='" + shortAnswer1Id + "']").type(text1ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
        cy.get("input[name='" + shortAnswer2Id + "']").type(text2ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
      });
    });

    it.skip('Test ShowAny Contains condition', () => {
      const text1ToInsert = 'test';
      const text2ToInsert = 'asdasd';
      const shortAnswer1Id = faker.random.uuid();
      const shortAnswer2Id = faker.random.uuid();
      const shortAnswer3Id = faker.random.uuid();
      const formModel: FormModel = { name: `${this.form.formPrefix}${faker.random.uuid()}`}; 
      const form = new FormBuilder()
      .withName(formModel.name)
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer1Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer2Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer3Id)
        .addShowAnyConditions()
        .addRule()
        .withContainsRule(shortAnswer1Id, text1ToInsert)
        .withContainsRule(shortAnswer2Id, text2ToInsert)
        .done()
        .done()
        .done()
        .done()
        .done()
        .done()
        .build();

      form.insertFormOnPage({ form }).then(() => {
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
        cy.get("input[name='" + shortAnswer1Id + "']").type(text1ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
        cy.get("input[name='" + shortAnswer2Id + "']").type(text2ToInsert + faker.random.uuid()).blur();
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
      });
    });

    it.skip('Test field with contains condition on another page', () => {
      const textToInsert = 'test';
      const shortAnswer1Id = faker.random.uuid();
      const shortAnswer2Id = faker.random.uuid();
      const shortAnswer3Id = faker.random.uuid();
      const formModel: FormModel = { name: `${this.form.formPrefix}${faker.random.uuid()}`};
      const form = new FormBuilder()
      .withName(formModel.name)
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer1Id)
        .done()
        .done()
        .done()
        .done()
        .addPage()
        .addFieldSet()
        .addContainer()
        .addShortAnswerField()
        .withId(shortAnswer2Id)
        .done()
        .addShortAnswerField()
        .withId(shortAnswer3Id)
        .addShowAllConditions()
        .addRule()
        .withContainsRule(shortAnswer1Id, textToInsert)
        .done()
        .done()
        .done()
        .done()
        .done()
        .done()
        .build();

      form.insertFormOnPage({ form }).then(() => {
        cy.get("input[name='" + shortAnswer1Id + "']").type("not the expected text").blur();
        cy.get("input[value='Next']").click();
        cy.get("input[name='" + shortAnswer3Id + "']").should('not.be.visible');
        cy.get("input[value='Previous']").click();
        cy.get("input[name='" + shortAnswer1Id + "']").type(textToInsert + faker.random.uuid()).blur();
        cy.get("input[value='Next']").click();
        cy.get("input[name='" + shortAnswer3Id + "']").should('be.visible');
      });
    })
  });

import {
  bootstrapModeler,
  inject
} from 'test/TestHelper';

import { is } from 'lib/util/ModelUtil';

import modelingModule from 'lib/features/modeling';
import coreModule from 'lib/core';


describe('features/modeling - remove participant behavior', function() {

  var testModules = [ coreModule, modelingModule ];


  describe('when removing participant in collaboration', function() {

    var processDiagramXML = require('../../../../fixtures/bpmn/collaboration/collaboration-message-flows.bpmn');

    beforeEach(bootstrapModeler(processDiagramXML, { modules: testModules }));


    describe('retain collaboration', function() {

      it('execute', inject(function(modeling, elementRegistry, canvas) {

        // given
        var participantShape = elementRegistry.get('Participant_2');

        // when
        modeling.removeShape(participantShape);

        // then
        var rootElement = canvas.getRootElement();

        expect(is(rootElement, 'bpmn:Collaboration')).to.be.ok;
      }));

    });

  });


  describe('when removing last remaining participant', function() {

    var processDiagramXML = require('../../../../fixtures/bpmn/collaboration/collaboration-empty-participant.bpmn');

    beforeEach(bootstrapModeler(processDiagramXML, { modules: testModules }));


    describe('should transform diagram into process diagram', function() {

      it('execute', inject(function(modeling, elementRegistry, canvas) {

        // given
        var participantShape = elementRegistry.get('_Participant_2'),
            participant = participantShape.businessObject,
            participantDi = participant.di,
            process = participant.processRef,
            collaborationElement = participantShape.parent,
            collaboration = collaborationElement.businessObject,
            diPlane = collaboration.di,
            bpmnDefinitions = collaboration.$parent;

        // when
        modeling.removeShape(participantShape);

        // then
        expect(participant.$parent).not.to.be.ok;

        var newRootShape = canvas.getRootElement(),
            newRootBusinessObject = newRootShape.businessObject;

        expect(newRootBusinessObject.$instanceOf('bpmn:Process')).to.be.true;

        // collaboration DI is unwired
        expect(participantDi.$parent).not.to.be.ok;
        expect(collaboration.di).not.to.be.ok;

        expect(bpmnDefinitions.rootElements).not.to.include(process);
        expect(bpmnDefinitions.rootElements).not.to.include(collaboration);

        // process DI is wired
        expect(diPlane.bpmnElement).to.eql(newRootBusinessObject);
        expect(newRootBusinessObject.di).to.eql(diPlane);

        expect(bpmnDefinitions.rootElements).to.include(newRootBusinessObject);
      }));


      it('undo', inject(function(modeling, elementRegistry, canvas, commandStack) {

        // given
        var participantShape = elementRegistry.get('_Participant_2'),
            participant = participantShape.businessObject,
            originalRootElement = participantShape.parent,
            originalRootElementBo = originalRootElement.businessObject,
            bpmnDefinitions = originalRootElementBo.$parent,
            participantDi = participant.di,
            diPlane = participantDi.$parent;

        modeling.removeShape(participantShape);

        // when
        commandStack.undo();

        // then
        expect(participant.$parent).to.eql(originalRootElementBo);
        expect(originalRootElementBo.$parent).to.eql(bpmnDefinitions);

        expect(canvas.getRootElement()).to.eql(originalRootElement);

        // di is unwired
        expect(participantDi.$parent).to.eql(originalRootElementBo.di);

        // new di is wired
        expect(diPlane.bpmnElement).to.eql(originalRootElementBo);
      }));

    });

  });


  describe('when collapsing participant', function() {

    var processDiagramXML = require('./RemoveParticipantBehavior.bpmn');

    beforeEach(bootstrapModeler(processDiagramXML, { modules: testModules }));


    it('should reconnect message flows to collapsed participant (incoming)', inject(
      function(bpmnReplace, elementRegistry) {

        // given
        var participant = elementRegistry.get('Participant_1');

        // when
        participant = bpmnReplace.replaceElement(participant, {
          type: 'bpmn:Participant',
          isExpanded: false
        });

        // then
        expect(participant.incoming).to.have.length(2);

        expect(elementRegistry.get('Flow_1').waypoints).to.eql([
          {
            original: {
              x: 350,
              y: 520
            },
            x: 350,
            y: 480
          },
          {
            original: {
              x: 350,
              y: 140
            },
            x: 350,
            y: 140
          }
        ]);

        expect(elementRegistry.get('Flow_2').waypoints).to.eql([
          {
            original: {
              x: 790,
              y: 520
            },
            x: 790,
            y: 480
          },
          {
            x: 790,
            y: 360
          },
          {
            x: 370,
            y: 360
          },
          {
            original: {
              x: 370,
              y: 140
            },
            x: 370,
            y: 140
          }
        ]);
      }
    ));


    it('should reconnect message flows to collapsed participant (outgoing)', inject(
      function(bpmnReplace, elementRegistry) {

        // given
        var participant = elementRegistry.get('Participant_4');

        // when
        participant = bpmnReplace.replaceElement(participant, {
          type: 'bpmn:Participant',
          isExpanded: false
        });

        // then
        expect(participant.outgoing).to.have.length(2);

        expect(elementRegistry.get('Flow_3').waypoints).to.eql([
          {
            original: {
              x: 780,
              y: 720
            },
            x: 780,
            y: 720
          },
          {
            x: 780,
            y: 680
          },
          {
            x: 360,
            y: 680
          },
          {
            original: {
              x: 360,
              y: 520
            },
            x: 360,
            y: 560
          }
        ]);

        expect(elementRegistry.get('Flow_4').waypoints).to.eql([
          {
            original: {
              x: 800,
              y: 720
            },
            x: 800,
            y: 720
          },
          {
            original: {
              x: 800,
              y: 520
            },
            x: 800,
            y: 560
          }
        ]);
      }
    ));

  });

});
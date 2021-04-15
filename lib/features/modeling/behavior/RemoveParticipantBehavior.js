import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from '../../../util/ModelUtil';

import { isExpanded } from '../../../util/DiUtil';

import { selfAndAllChildren } from 'diagram-js/lib/util/Elements';

import {
  getResizedSourceAnchor,
  getResizedTargetAnchor
} from 'diagram-js/lib/features/modeling/cmd/helper/AnchorsHelper';

/**
 * BPMN specific remove behavior
 */
export default function RemoveParticipantBehavior(connectionDocking, eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);


  /**
   * morph collaboration diagram into process diagram
   * after the last participant has been removed
   */

  this.preExecute('shape.delete', function(context) {

    var shape = context.shape,
        parent = shape.parent;

    // activate the behavior if the shape to be removed
    // is a participant
    if (is(shape, 'bpmn:Participant')) {
      context.collaborationRoot = parent;
    }
  }, true);

  this.postExecute('shape.delete', function(context) {

    var collaborationRoot = context.collaborationRoot;

    if (collaborationRoot && !collaborationRoot.businessObject.participants.length) {

      // replace empty collaboration with process diagram
      modeling.makeProcess();
    }
  }, true);

  this.postExecute('shape.replace', function(context) {
    var oldShape = context.oldShape,
        newShape = context.newShape;

    if (!isCollapse(oldShape, newShape)) {
      return;
    }

    var messageFlows = getMessageFlows(oldShape);

    messageFlows.incoming.forEach(function(incoming) {

      // (1) Reconnect to expanded participant
      var docking = connectionDocking.getDockingPoint(incoming, oldShape, true);

      if (docking.actual) {
        modeling.reconnectEnd(incoming, oldShape, docking.actual);

        var newAnchor = getResizedTargetAnchor(incoming, newShape, oldShape);

        // (2) Reconnect to expanded participant
        modeling.reconnectEnd(incoming, newShape, newAnchor);
      }
    });

    messageFlows.outgoing.forEach(function(outgoing) {

      // (1) Reconnect to expanded participant
      var docking = connectionDocking.getDockingPoint(outgoing, oldShape, true);

      if (docking.actual) {
        modeling.reconnectStart(outgoing, oldShape, docking.actual);

        var newAnchor = getResizedSourceAnchor(outgoing, newShape, oldShape);

        // (2) Reconnect to expanded participant
        modeling.reconnectStart(outgoing, newShape, newAnchor);
      }
    });
  }, true);

}

RemoveParticipantBehavior.$inject = [ 'connectionDocking', 'eventBus', 'modeling' ];

inherits(RemoveParticipantBehavior, CommandInterceptor);

// helpers //////////

function isCollapse(oldShape, newShape) {
  return is(oldShape, 'bpmn:Participant')
    && isExpanded(oldShape)
    && is(newShape, 'bpmn:Participant')
    && !isExpanded(newShape);
}

function getMessageFlows(parent) {
  var elements = selfAndAllChildren([ parent ], false);

  var incoming = [],
      outgoing = [];

  elements.forEach(function(element) {
    if (element === parent) {
      return;
    }

    element.incoming.forEach(function(connection) {
      if (is(connection, 'bpmn:MessageFlow')) {
        incoming.push(connection);
      }
    });

    element.outgoing.forEach(function(connection) {
      if (is(connection, 'bpmn:MessageFlow')) {
        outgoing.push(connection);
      }
    });
  }, []);

  return {
    incoming: incoming,
    outgoing: outgoing
  };
}
SimpleUpdateField = function(selector) {
  var self = this
  self.selector = selector
  self.current_input = function () {
    return $(self.selector + ' > input')
  }
  // Given a node with text() create an input that has the nodes text as it's value
  // and record a memo about what the original-text is 
  //
  var create_input_from = function(node) {

    var input_node = $("<input/>")
    var attributes = node.get(0).attributes
    for(var i = attributes.length-1; i >=0; i--) {
      if(attributes[i].nodeName.indexOf('editable') == 0) {
        input_node.attr(attributes[i].nodeName, attributes[i].nodeValue)
      }
    }
    input_node.data('original-text',node.text())
    input_node.val(node.text().trim())

    return input_node
  }

  self.begin_edit_event = function(event) {
      var clicked_node = $(this);
      var input_node = create_input_from(clicked_node);
      clicked_node.text("")
      clicked_node.append(input_node)
      install_edit_complete_notions(input_node)
      input_node.focus();
  }
  var is_rollback_changes  = function() {
    if (self.last_keydown_event) {
      if (self.last_keydown_event.keyCode == SimpleUpdateField.ESC_KEY) {
        return true
      }
    }
    return false
  }
  var is_blur_tab_redirect = function () {
    if (self.last_keydown_event) {
      if (self.last_keydown_event.keyCode == SimpleUpdateField.TAB_KEY) {
        return true
      }
      if (self.last_keydown_event.keyCode == SimpleUpdateField.ENTER_KEY) {
        return true
      }
    }
    return false
  }
  var move_to_next_sibling = function(element) {
    if(element.attr('editable-index')) {
      var next_position = parseInt(element.attr('editable-index')) +1
      var next_editable = $(selector).filter('[editable-index='+next_position+']')
      if (next_editable.size() == 0) {
        next_editable = $(selector).filter('[editable-index=1]')
      }
      next_editable.trigger('click.editable')
    }else {
      throw 'Expected to be able to assign custom attribute editable-index'
    }
  }
  self.rollback_edit_event = function(event) {
    var finished_input_node = $(this)

    finished_input_node.parent().text(finished_input_node.data('original-text')) // the input we create had a memo about it's original text
    finished_input_node.remove() // remove the input field that we created such that the node is unchanged

  }
  self.commit_to_remote_resource = function(node) {
    uri        = node.attr('editable-resource-uri')
    name       = node.attr('editable-resource-model')
    attribute  = node.attr('editable-resource-attribute')
    id         = node.attr('editable-resource-id')
    data       = {}
    data['id'] = id
    data[name] = {}
    data[name][attribute] = node.val().trim()
    $.ajax({url:uri,data:data,type:'PUT'})
  }

  self.complete_edit_event = function(event) {

    var finished_input_node = $(this)
    var parent = finished_input_node.parent();

    commit_to_remote_resource(finished_input_node)
    parent.text(finished_input_node.val()) // set the elements character data back to text

    finished_input_node.remove() // remove the input field that we created such that the node is unchanged


    // If tab key was hit during the edit phase
    // we want to redirect this blur to be a click on the next
    // sibling
    if(is_blur_tab_redirect()) {
      move_to_next_sibling(parent)
    }

    // Cleanup - cross event state
    // there was no last keydown event
    self.last_keydown_event = undefined;
  }

  var install_edit_notions = function(selector) {

    $(selector).bind('click.editable',begin_edit_event)
    $(selector).bind('mouseover.editable',function() {
      $(this).addClass('editable-hover')
    })

    $(selector).bind('mouseout.editable',function() {
      $(this).removeClass('editable-hover')
    })
  }

  var install_edit_complete_notions = function (selector) {

    $(selector).bind('keydown.editable',function(e) {
      self.last_keydown_event = e
      if(is_blur_tab_redirect()) {
        $(this).trigger('blur.editable')
        return false; // manually handle tab - no event propigation
      }
      if(is_rollback_changes()) {
       $(this).trigger('rollback.editable')
       return false;
      }
      return true // allow default propigation
    })

    $(selector).bind('blur.editable',self.complete_edit_event)
    $(selector).bind('rollback.editable',self.rollback_edit_event)
  }
  var annotate_editable_with_position = function(selector) {
    $(selector).each(function(i,el) {
      $(el).attr('editable-index',i+1)
    })
  }
  
  var annotate_with_resource_errors = function(selector) {
    $(selector).each(function(i,el){
      if (!($(el).attr('editable-resource-uri')) ||
            $(el).attr('editable-resource-uri') == "") {
        $(el).parent().append('<div class="editable-errors">expected editable-resource-uri attribute in form http://server/resource/id</div>')
       }
      if (!($(el).attr('editable-resource-model')) ||
            $(el).attr('editable-resource-model') == "") {
        $(el).parent().append('<div class="editable-errors">expected editable-resource-model attribute in underscorized-rails form</div>')
       }
      if (!($(el).attr('editable-resource-attribute')) ||
            $(el).attr('editable-resource-attribute') == "") {
        $(el).parent().append('<div class="editable-errors">expected editable-resource-attribute attribute in underscorized-rails form </div>')
       }
    })
  }

  var install = function() {
    install_edit_notions(selector)
    annotate_editable_with_position(selector)
    annotate_with_resource_errors(selector)
    $(selector).data('editable','installed')
  }()
  return self;
}
SimpleUpdateField.TAB_KEY   = 9   // tab is   #9
SimpleUpdateField.ENTER_KEY = 13  // enter is #13
SimpleUpdateField.ESC_KEY   = 27  // enter is #13
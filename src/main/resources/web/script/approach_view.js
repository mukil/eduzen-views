/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")

var aView = new function () {

  this.historyApiSupported = window.history.pushState

  this.user = undefined
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLecture = undefined // FIXME: move to uView, support many

  /** excercise View application controler **/

  this.initViews = function () { 
    aView.user = aView.getCurrentUser()
    // handling deep links
    var entryUrl = window.location.href
    entryUrl = entryUrl.substr(entryUrl.indexOf("view/") + 5)
    console.log("entry point => " + entryUrl.split("/"))
    commands = entryUrl.split("/")
    var entity = commands[0]
    var topicalareaId = commands[1]
    var excerciseId = undefined
    if (entity === "topicalarea") {
      console.log("load topicalarea-view for => " + topicalareaId)
      if (commands[2] === "etext") {
        excerciseId = commands[3]
        console.log("  load excercise-view for => " + excerciseId)
      }
      aView.initApproachView(topicalareaId, excerciseId)
    } else if (entity === "lectures") {
      aView.renderHeader()
      console.log("why not loading all lectures a user is partcipating in..")
      console.log(aView.loadLecturesUserIsParticipatingIn())
      // ### todo: laod available lectures via "tub.eduzen.identity", implement this in uView
      // push new application state /topicalarea/id
    }
  }

  this.initApproachView = function (topicalareaId, excerciseId) {
    if (topicalareaId != undefined) {
      aView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
      aView.renderHeader()
      // ### render general infos for topicalarea
      if (excerciseId != undefined) {
        aView.currentExcerciseText = dmc.get_topic_by_id(excerciseId, true)
        aView.renderExcercise() // current excercise, set by url
      } else {
        // ### or all other excercises from within our current topicalarea
        // aView.renderAllExcercises()
        console.log(dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.excercise", 
          "assoc_type_uri": "tub.eduzen.author"}))
      }
    } else {
      // no topicalarea set, no excercise_text requested.. get all open topical areas
      // eView.currentTopicalareas = aView.loadTopicalAreasByXYZ(aView.user.id).items
      // eView.renderTopicalareas()
      // ### eView.currentTopicalareas = aView.loadTopicalAreasByUserId(aView.user.id).items
      /** if (aView.currentTopicalareas != undefined) {
        aView.renderTopicalareas()
      } **/
      // and render all excercises ever (?) for our current user
    }
  }

  this.renderHeader = function () {
      $("#header").addClass("approach-view")
      aView.renderUser()
  }

  this.renderExcercise = function () {
    var eId = aView.currentExcerciseText.id
    var eName = aView.currentExcerciseText.value
    var eText = aView.currentExcerciseText.composite["tub.eduzen.excercise_description"].value
    $("<b class=\"label\">Hier ist die Aufgabentellung</b><br/><br/>").insertBefore("#bottom")
    $("<div class=\"excercise-text\">" + eName + "<br/><br/>"
      + eText + "</div><br/><br/>").insertBefore("#bottom")   
    $("#content").append("<a class=\"button\" href=\"javascript:aView.takeOnThisExcercise()\"" 
      + " alt=\"Aufgabenstellung entgegennehmen\" title=\"Aufgabenstellung entgegennehmen\">"
      + "Aufgabenstellung entgegennehmen</a>")
  }

  this.renderUser = function () {
    if (aView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutzen Sie zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $(".title").html("Hi <a href=\"/eduzen/view/user/" + aView.user.id + "\" class=\"username\"> "
        + aView.user.value + "</a>, viel Erfolg beim rechnen.<p><br/></p>")
    }
  }

  /** Controler to take on an excercise **/

  this.takeOnThisExcercise = function () {
    // create Excercise and relate it to excerciseTextId and relate it to userId 
    var tub = aView.getTUBIdentity()
    var eText = aView.currentExcerciseText
    console.log(tub)
    // ### to clarify: author of approach or author of excercise, taking the latter
    /** var excercise = dmc.create_topic({ "type_uri": "tub.eduzen.excercise"})
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":tub.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"}
    }
    var excerciseTextModel = { "type_uri":"dm4.core.aggregation", 
      "role_1":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":eText.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(authorModel)
    dmc.create_association(excerciseTextModel)
    // excercise-objects will be assigned to the excercise taken by the current user, in the approach-view
    // but when do we know that we need to get an excercise-object an when not?
    aView.getExcerciseObject(eText.id, excercise.id) **/
    // so, we cannot distinct if an excercise_text is a) self-contained or b) needs an excercise-object?
    aView.createApproachForExcercise()
    // navigate to approach view..
  }

  this.createApproachForExcercise = function () {
    aView.renderApproachForm()
    // 
  }

  this.renderApproachForm = function  () {
    // ### 
  }

  this.getExcerciseObject = function (excerciseTextId, excerciseId) {
    // method to find a compatible excercise-object for our currentExcercise, ### which was not used yet by user
    // and assign this object to the given excercise
    var compatibleObjects = dmc.get_topic_related_topics(excerciseTextId, 
      {"others_topic_type_uri": "tub.eduzen.excercise_object", "assoc_type_uri": "tub.eduzen.compatible"})
    var compatible = (compatibleObjects.total_count > 0) ? compatibleObjects.items[0] : undefined // just take one
    var compatibleModel = { "type_uri":"dm4.core.aggregation", 
      "role_1":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":compatible.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(compatibleModel)
  }

  this.getTUBIdentity = function () {
    var ids = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity"})
    return (ids.total_count > 0) ? dmc.get_topic_by_id(ids.items[0].id, true) : undefined
  }

  this.loadLecturesUserIsParticipatingIn = function () {
    if (aView.user == undefined) return undefined
    // get "username"-id, to get "tub.eduzen.identity"-id to then find related lectures
    var identity = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity", 
      "assoc_type_uri": "dm4.core.aggregation"}).items[0]
    return dmc.get_topic_related_topics(identity.id, {"others_topic_type_uri": "tub.eduzen.lecture", 
      "assoc_type_uri": "tub.eduzen.participant"})
  }

  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!aView.historyApiSupported) return
    // do handle pop events
  }

  this.pushHistory = function (state, link) {
    if (!aView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  /** Methods to access eduzen and accesscontrol REST-Services **/

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(aView.initViews)

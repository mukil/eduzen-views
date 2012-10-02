/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")

var eView = new function () {

  this.historyApiSupported = window.history.pushState
  this.insertDummyContents = false
  this.user = undefined
  this.defaultLecture = 421249 // Mathematik 1 für ChemikerInnen
  this.currentLecture = undefined
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined

  /** excercise View application controler **/

  this.initViews = function () { 
    eView.user = eView.getCurrentUser()
    if (eView.user != undefined) {
      eView.createSomeDummyExcerciseAssocs()
    }
    // handling deep links
    var entryUrl = window.location.href
    entryUrl = entryUrl.substr(entryUrl.indexOf("view/") + 5)
    console.log("entry point => " + entryUrl.split("/"))
    commands = entryUrl.split("/")
    var entity = commands[0]
    var id = commands[1]
    var topicalareaId = undefined
    if (entity === "lecture") {
      console.log("load lecture-view for => " + id)
      if (commands[2] === "topicalarea") {
        topicalareaId = commands[3]
        console.log("  load topicalarea-view for => " + topicalareaId)
      }
      eView.initLectureView(id, topicalareaId)
    } else if (entity === "start") {
      // ### todo: laod available lectures via "tub.eduzen.identity", implement this in uView
      eView.initLectureView(eView.defaultLecture)
      // push new application state.. /lecture/id
    }
  }

  this.initLectureView = function (id, topicalareaId) {
    eView.currentLecture = eView.loadCourseEvent(id)
    if (eView.currentLecture != undefined) {
      eView.renderHeader()
      eView.renderLecture()
      if (topicalareaId != undefined) {
        eView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
        eView.renderTopicalarea()
      } else { // render all topicalareas
        eView.currentTopicalareas = eView.loadTopicalAreasByLV(eView.currentLecture.id).items
        if (eView.currentTopicalareas != undefined) {
          eView.renderTopicalareas()
        }
      }
    }
  }

  this.renderHeader = function () {
      eView.renderUser()
  }

  this.renderUser = function () {
    if (eView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutzen Sie zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $(".title").html("Hi <a href=\"/eduzen/view/user/" + eView.user.id + "\" class=\"username\"> "
        + eView.user.value + "</a>!<p><br/></p>")
    }
  }

  this.renderLecture = function () {
    $(".title").append("Hier findest du &Uuml;bungsaufgaben zu deiner Lehrveranstaltung <a href=\"/eduzen/view/lecture/"
      + eView.currentLecture.id + "\" class=\"lecturename\">" + eView.currentLecture.value + "</a>")
  }

  this.renderTopicalareas = function () {
    for (i = 0; i < eView.currentTopicalareas.length; i++) {
      var topicalarea = eView.currentTopicalareas[i]
      var lectureId = eView.currentLecture.id
      if (topicalarea != undefined) {
        $("#result-list").append("<li><a href=\"/eduzen/view/lecture/" + lectureId + "/topicalarea/"
          + topicalarea.id + "\" class=\"topicalareaname\" alt=\"" + topicalarea.value + "\" title=\"Themenkomplex: "
          + topicalarea.value + "\">" + topicalarea.value + "</a></li>") 
      }
    }
  }

  this.renderTopicalarea = function () {
    // "<a href=\"/eduzen/view/lecture/" + lectureId + "\" class=\"back\">Zur&uuml;ck</a>"
    var tpName = eView.currentTopicalarea.value
    var backtopic = "<p class=\"buffer\">Sie schauen gerade auf den Themenkomplex <a href=\"/eduzen/view/lecture/"
      + eView.currentLecture.id + "/topicalarea/"
      + eView.currentTopicalarea.id + "\" class=\"topicalareaname selected\" title=\"Themenkomplex: "
      + tpName + "\" alt=\"" + tpName + "\">" + tpName + "</a></p>"
    $("#results").append(backtopic)
    // load excercise-texts for this topicalarea
    eView.loadExcerciseTextsForTopicalarea()
    // eView.renderExcerciseText()
  }

  /** Controler to take on an excercise **/

  this.takeOnExcerciseForUser = function (eId, uId) {
    console.log("excerciseId => " + eId + " userId => " + uId);
    // create Excercise and relate it to excerciseTextId and relate it to userId 
    // FIXME: author is not "dm4.accesscontrol.username" but should be "tub.eduzen.identity"
    // to clarify: author of approach or author of excercise..
    var excercise = dmc.create_topic({ "type_uri": "tub.eduzen.excercise"})
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":eView.user.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"}
    }
    var authorAssociation = dmc.create_association(authorModel)
    // excercise-objects will be assigned to the excercise taken by the current user, in the approach-view
    // then 1question remains: 
        // we cannot distinct if an excercise_text is a) self-contained or b) needs an excercise-object?
    // navigate to approach view..
    window.location.href = host + "/eduzen/view/topicalarea/" + eView.currentTopicalarea.id + "/etext/" + eId
  }

  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!eView.historyApiSupported) return
    // do handle pop events
  }

  this.pushHistory = function (state, link) {
    if (!eView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  /** Methods to access eduzen and accesscontrol REST-Services **/

  this.loadCourseEvent = function(id) {
    return dmc.get_topic_by_id(id, true)
  }

  this.loadTopicalAreasByLV = function(id) {
    return dmc.get_topic_related_topics(id, {"others_topic_type_uri": "tub.eduzen.topicalarea", 
      "assoc_type_uri": "tub.eduzen.lecture_content"})
  }

  this.loadExcerciseTextsForTopicalarea = function () {
    // load association between lecture and topicalarea
    // FIXME: an ET could be many times lecture_content?
    var contentAssociation = dmc.get_association("tub.eduzen.lecture_content", 
      eView.currentLecture.id, eView.currentTopicalarea.id, "dm4.core.default", "dm4.core.default", true)
    var excercise_texts = dmc.get_association_related_topics(contentAssociation.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      var excercise_text = dmc.get_topic_by_id(e_text.id, true)
      $("#result-list").append("<li id=\"" + excercise_text.id + "\" class=\"excercise\">"
        + excercise_text.value + "<span class=\"take button\" alt=\"Aufgabenstellung entgegennehmen\""
        + " title=\"Aufgabenstellung entgegennehmen\">Rechnen</a></li>")
      $("li#" + excercise_text.id + " .take.button").click(eView.createExcerciseHandler(excercise_text))
    }
    $("#result-list").addClass("excercise_texts")
  }

  this.createExcerciseHandler = function (e_text) {
      return function() {
        eView.takeOnExcerciseForUser(e_text.id, eView.user.id)
      }
  }

  this.createSomeDummyExcerciseAssocs = function () {
    if (eView.insertDummyContents) {
      console.log("\"" + eView.user.value + "\" is creating associations per script to connect"
        + " excercise_texts with lecture_content associations")
      // TKs LVI-Edge Elementare Funktionen: 429031 
      // ET Vektoralgebra: 80859
      // ET Algebraische und Transzendente Funktionen: 43103
      // ET Skizzieren des Graphen: 21422
      var assocModel1 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":429031,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":80859,"role_type_uri":"dm4.core.default"}
      }
      var assocModel2 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":429031,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":43103,"role_type_uri":"dm4.core.default"}
      }
      var assocModel3 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":429031,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":21422,"role_type_uri":"dm4.core.default"}
      }
      dmc.create_association(assocModel1)
      dmc.create_association(assocModel2)
      dmc.create_association(assocModel3)
      // TKs LVI-Edge Imaginäre Einheit: 429283
      // ET Komplexe Zahlen: 292971
      var assocModel4 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":429283,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":292971,"role_type_uri":"dm4.core.default"}
      }
      dmc.create_association(assocModel4)
    }
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(eView.initViews)

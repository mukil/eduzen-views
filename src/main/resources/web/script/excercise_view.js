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
  this.defaultLecture = 130485 // Lecture of Mathematik 1 für ChemikerInnen
  this.currentLecture = undefined
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined

  /** Excercise View Application Controler **/

  this.initViews = function () {
    // This view routes on "lecture/423515/topicalarea/68429", "lecture/423515/" and "/start"

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
      if (commands[2] === "topicalarea") {
        topicalareaId = commands[3]
      }
      eView.initLectureView(id, topicalareaId)
    } else if (entity === "start") {
      // ### todo: laod available lectures via "tub.eduzen.identity", implement this in uView
      eView.initLectureView(eView.defaultLecture)
      // push new application state.. /lecture/id
    }
  }

  this.initLectureView = function (lectureId, topicalareaId) {
    eView.currentLecture = dmc.get_topic_by_id(lectureId, true)
    if (eView.currentLecture != undefined) {
      eView.renderHeader()
      if (eView.user == undefined) throw new Error("Your user has no TUB Identity. Please login first.")
      eView.renderLecture()
      if (topicalareaId != undefined) {
        // ### FIXME: check access if topicalarea is really part of this lecture
        eView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
        console.log("  load also topicalarea-view for => " + topicalareaId)
        // ### eView.loadSomeContentForThisTopicalarea()
        // ### eView.renderSomeContentForThisTopicalarea()
        eView.renderTopicalarea()
        // load excercise-texts for this topicalarea
        // ### eView.loadExcerciseTextsForTopicalarea()
        // ### eView.renderExcerciseText()
      } else { // render all topicalareas
        console.log("load lecture-view for => " + lectureId)
        eView.currentTopicalareas = eView.loadTopicalAreasByLV(eView.currentLecture.id).items
        if (eView.currentTopicalareas != undefined) {
          eView.renderTopicalareas()
        }
      }
    }
  }

  this.renderHeader = function () {
      $(".eduzen").addClass("lecture-view")
      eView.renderUser()
  }

  this.renderUser = function () {
    if (eView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutzen Sie zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $(".title").html("Hi <a href=\"/eduzen/view/user/" + eView.user.id + "\" class=\"btn username\"> "
        + eView.user.value + "</a>, ")
    }
  }

  this.renderLecture = function () {
    var courseName = eView.getNameOfCourse(eView.currentLecture.id).items[0].value
    $(".title").append("hier findest du &Uuml;bungs- und Beispielaufgaben zu deiner" 
      + " Lehrveranstaltung <a href=\"/eduzen/view/lecture/" + eView.currentLecture.id
      + "\" class=\"lecturename\">"+ courseName +" / "+ eView.currentLecture.value +"</a>")
  }

  this.renderTopicalareas = function () {
    $("<p class=\"buffer\"><b class=\"label\">Dies ist deine pers&ouml;nliche &Uuml;bersicht &uuml;ber alle "
      + "Themenkomplexe die in dieser Pr&uuml;fung abgefragt werden k&ouml;nnen:</b></p>")
      .insertBefore("#result-list")
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
    // render n-balken below
    // "<a href=\"/eduzen/view/lecture/" + lectureId + "\" class=\"back\">Zur&uuml;ck</a>"
    var tpName = eView.currentTopicalarea.value
    var backtopic = "<p class=\"buffer\"><b class=\"label\">Du schaust gerade auf den Themenkomplex</b> "
      + "<a href=\"/eduzen/view/lecture/" + eView.currentLecture.id + "/topicalarea/"
      + eView.currentTopicalarea.id + "\" class=\"topicalareaname selected\" title=\"Themenkomplex: "
      + tpName + "\" alt=\"" + tpName + "\">" + tpName + "</a></p>"
    $("#header").append(backtopic)
    // load excercise-texts for this topicalarea
    eView.loadExcerciseTextsForTopicalarea()
    // eView.renderExcerciseText()
  }

  /** Controler to take on an excercise **/

  this.showExcerciseTextForUser = function (eId, uId) {
    console.log("excerciseId => " + eId + " userId => " + uId)
    window.location.href = host + "/eduzen/view/lecture/" + eView.currentLecture.id
      + "/topicalarea/" + eView.currentTopicalarea.id + "/etext/" + eId
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

  this.loadTopicalAreasByLV = function(id) {
    return dmc.get_topic_related_topics(id, {"others_topic_type_uri": "tub.eduzen.topicalarea", 
      "assoc_type_uri": "tub.eduzen.lecture_content"})
  }

  this.loadExcerciseTextsForTopicalarea = function () {
    // load association between lecture and topicalarea
    // FIXME: an ET could be many times lecture_content? as soon as we support multiple-lectures
    var contentAssociation = dmc.get_association("tub.eduzen.lecture_content", 
      eView.currentLecture.id, eView.currentTopicalarea.id, "dm4.core.default", "dm4.core.default", true)
    var excercise_texts = dmc.get_association_related_topics(contentAssociation.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items

    if (excercise_texts.length > 1) {
      $("<p class=\"buffer\"><b class=\"label\">Das sind die "
        + excercise_texts.length + " Aufgabenstellung/en zum meistern dieses Themenkomplexes</b></p>").insertBefore("#result-list")
    } else if (excercise_texts.length == 1) {
      $("<p class=\"buffer\"><b class=\"label\">Hier ist die Aufgabenstellung zum meistern dieses Themenkomplexes</b></p>")
        .insertBefore("#result-list")
    } else {
      $("<p class=\"buffer\"><b class=\"label\">Es wurden leider noch keine Aufgabenstellungen "
        + " f&uuml;r diesen Themenkomplex in deiner Lehrveranstaltung definiert.</b></p>")
        .insertBefore("#result-list")
    }
    
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      var excercise_text = dmc.get_topic_by_id(e_text.id, true)
      $("#result-list").append("<li id=\"" + excercise_text.id + "\" class=\"excercise\">"
        + excercise_text.value + "<span class=\"take button\" alt=\"Ansehen\""
        + " title=\"Ansehen\">Ansehen</a></li>")
      $("li#" + excercise_text.id + " .take.button").click(eView.createExcerciseTextHandler(excercise_text))
    }
    $("#result-list").addClass("excercise_texts")
  }

  this.createExcerciseTextHandler = function (e_text) {
      return function() {
        eView.showExcerciseTextForUser(e_text.id, eView.user.id)
      }
  }

  this.createSomeDummyExcerciseAssocs = function () {
    if (eView.insertDummyContents) {
      console.log("\"" + eView.user.value + "\" is creating associations per script to connect"
        + " excercise_texts with lecture_content_* associations")
      // ### TKs LVI-Edge Elementare Funktionen: 429031 
      // TKs LVI-Edge Eigenschaften stetiger Funktionen: 431380
      // TKs LVI-Edge Zusammengesetze Funktionen: 431128
      // TKs LVI-Edge Symmetrie: 431795
      // ET Vektoralgebra: 80859
      // ET Algebraische und Transzendente Funktionen: 43103
      // ET Skizzieren des Graphen: 21422
      var assocModel1 = { "type_uri":"tub.eduzen.lecture_content_excercise", 
        "role_1":{"assoc_id":431795,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":80859,"role_type_uri":"dm4.core.default"}
      }
      var assocModel2 = { "type_uri":"tub.eduzen.lecture_content_excercise", 
        "role_1":{"assoc_id":431795,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":43103,"role_type_uri":"dm4.core.default"}
      }
      var assocModel3 = { "type_uri":"tub.eduzen.lecture_content_excercise", 
        "role_1":{"assoc_id":431795,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":21422,"role_type_uri":"dm4.core.default"}
      }
      dmc.create_association(assocModel1)
      dmc.create_association(assocModel2)
      dmc.create_association(assocModel3)
      // ### TKs LVI-Edge Imaginäre Einheit: 429283
      // TKs LVI-Edge Leibnizsche Regel: 431296
      // TKs LVI-Edge Kartesische Koordinaten: 431879
      // ET Komplexe Zahlen: 292971
      var assocModel4 = { "type_uri":"tub.eduzen.lecture_content_excercise", 
        "role_1":{"assoc_id":431879,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":292971,"role_type_uri":"dm4.core.default"}
      }
      dmc.create_association(assocModel4)
    }
  }

  this.getNameOfCourse = function (lectureId) {
    return dmc.get_topic_related_topics(lectureId,
      {"others_topic_type_uri": "tub.eduzen.course", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(eView.initViews)

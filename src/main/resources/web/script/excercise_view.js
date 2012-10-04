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
  this.defaultLecture = 423515 // Lecture of Mathematik 1 für ChemikerInnen
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

  this.initLectureView = function (lectureId, topicalareaId) {
    eView.currentLecture = dmc.get_topic_by_id(lectureId, true)
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
        + eView.user.value + "</a>, ")
    }
  }

  this.renderLecture = function () {
    $(".title").append("hier findest du &Uuml;bungs- und Beispielaufgaben zu deiner" 
      + " Lehrveranstaltung <a href=\"/eduzen/view/lecture/" + eView.currentLecture.id
      + "\" class=\"lecturename\">" + eView.currentLecture.value + "</a>")
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
    // "<a href=\"/eduzen/view/lecture/" + lectureId + "\" class=\"back\">Zur&uuml;ck</a>"
    var tpName = eView.currentTopicalarea.value
    var backtopic = "<p class=\"buffer\"><b class=\"label\">Du schaust gerade auf den Themenkomplex</b> "
      + "<a href=\"/eduzen/view/lecture/" + eView.currentLecture.id + "/topicalarea/"
      + eView.currentTopicalarea.id + "\" class=\"topicalareaname selected\" title=\"Themenkomplex: "
      + tpName + "\" alt=\"" + tpName + "\">" + tpName + "</a></p>"
    $("#header").append(backtopic)
    eView.loadSampleExcerciseTextsForTopicalarea()
    // ### eView.loadSomeContentForThisTopicalarea()
    // load excercise-texts for this topicalarea
    eView.loadExcerciseTextsForTopicalarea()
    // eView.renderExcerciseText()
  }

  /** Controler to take on an excercise **/

  this.showExcerciseForUser = function (eId, uId) {
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
    // FIXME: an ET could be many times lecture_content?
    var contentAssociation = dmc.get_association("tub.eduzen.lecture_content", 
      eView.currentLecture.id, eView.currentTopicalarea.id, "dm4.core.default", "dm4.core.default", true)
    console.log(contentAssociation)

    var excercise_texts = dmc.get_association_related_topics(contentAssociation.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items
    if (excercise_texts.length > 1) {
      $("<p class=\"buffer\"><b class=\"label\">Versuch`s mal selbst mit einer der "
        + excercise_texts.length + " &Uuml;bungsaufgaben</b></p>").insertBefore("#result-list")
    } else if (excercise_texts.length == 1) {
      $("<p class=\"buffer\"><b class=\"label\">Versuch`s mal selbst mit der &Uuml;bungsaufgabe</b></p>")
        .insertBefore("#result-list")
    } else {
      $("<p class=\"buffer\"><b class=\"label\">Es wurden leider noch keine &Uuml;bungsaufgaben "
        + " f&uuml;r diesen Themenkomplex in deiner Lehrveranstaltung eingestellt.</b></p>")
        .insertBefore("#result-list")
    }
    
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      var excercise_text = dmc.get_topic_by_id(e_text.id, true)
      $("#result-list").append("<li id=\"" + excercise_text.id + "\" class=\"excercise\">"
        + excercise_text.value + "<span class=\"take button\" alt=\"Aufgabenstellung anzeigen\""
        + " title=\"Aufgabenstellung anzeigen\">Aufgabenstellung anzeigen</a></li>")
      $("li#" + excercise_text.id + " .take.button").click(eView.createExcerciseHandler(excercise_text))
    }
    $("#result-list").addClass("excercise_texts")
  }

  this.loadSampleExcerciseTextsForTopicalarea = function () {
    // FIXME make sure this is none of the excercise-texts assigned for this topicalarea in this lecture..
    var contentAssociation = dmc.get_association("tub.eduzen.lecture_content", 
      eView.currentLecture.id, eView.currentTopicalarea.id, "dm4.core.default", "dm4.core.default", true)
    var excercise_texts = dmc.get_association_related_topics(contentAssociation.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items
    var sampleApproach = undefined
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      // search for each ET if theres an excercise already taken and a sample approach available
      var hasSampleSolution = false
      var excercises = dmc.get_topic_related_topics(e_text.id, {"others_topic_type_uri": "tub.eduzen.excercise"})
      if (excercises.total_count > 0) { //
        // console.log(excercises.items.length + " times taken " + excerciseText.items[0].value + " excercise")
        for (taken in excercises.items) { // get all approaches submitted to this excercise
          var excerciseId = excercises.items[taken].id
          var approaches = dmc.get_topic_related_topics(excerciseId, {"others_topic_type_uri": "tub.eduzen.approach"})
          if (approaches.total_count > 0) { // find sample solutions..
            for (a in approaches.items) { // get all approaches marked as sample solution
              var approach = approaches.items[a]
              approach = dmc.get_topic_by_id(approach.id, true)
              // sanity check, some approaches have no value set here..
              if (approach.composite["tub.eduzen.approach_sample"]) {
                if (approach.composite["tub.eduzen.approach_sample"].value) {
                  hasSampleSolution = true
                  sampleApproach = approach
                } 
              }
            }
          } else {
            console.log("WARNING: no approaches submitted for eText " + e_text.id)
          }
        }
      }
      // ### selectSampleSolution to display, dont display the wrong one, and display not more than one
      if (hasSampleSolution) {
        console.log("INFO: yay, we`ve a sample-solution to show to our newbies, it`s on ET => " + e_text.id)
        console.log(sampleApproach)
        e_text = dmc.get_topic_by_id(e_text.id)
        var e_text_descr = e_text.composite["tub.eduzen.excercise_description"].value
        var sample_content = sampleApproach.composite["tub.eduzen.approach_content"].value
        var exampleHtml = "<p class=\"buffer\">"
        exampleHtml += "<b class=\"label\">Hier mal eine Beispielaufgabe</b><br/><br/>"
        exampleHtml += e_text_descr + "<br/><br/><b class=\"label\">"
          + " Und hier ist der dazugeh&ouml;rige L&ouml;sungsansatz</b><br/><br/>" + sample_content  + "</b></p>"
        $(exampleHtml).insertBefore("#result-list")
      }
    }
  }

  this.createExcerciseHandler = function (e_text) {
      return function() {
        eView.showExcerciseForUser(e_text.id, eView.user.id)
      }
  }

  this.createSomeDummyExcerciseAssocs = function () {
    if (eView.insertDummyContents) {
      console.log("\"" + eView.user.value + "\" is creating associations per script to connect"
        + " excercise_texts with lecture_content associations")
      // ### TKs LVI-Edge Elementare Funktionen: 429031 
      // TKs LVI-Edge Eigenschaften stetiger Funktionen: 431380
      // TKs LVI-Edge Zusammengesetze Funktionen: 431128
      // ET Vektoralgebra: 80859
      // ET Algebraische und Transzendente Funktionen: 43103
      // ET Skizzieren des Graphen: 21422
      var assocModel1 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":431380,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":80859,"role_type_uri":"dm4.core.default"}
      }
      var assocModel2 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":431128,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":43103,"role_type_uri":"dm4.core.default"}
      }
      var assocModel3 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":431128,"role_type_uri":"dm4.core.default"},
        "role_2":{"topic_id":21422,"role_type_uri":"dm4.core.default"}
      }
      dmc.create_association(assocModel1)
      dmc.create_association(assocModel2)
      dmc.create_association(assocModel3)
      // ### TKs LVI-Edge Imaginäre Einheit: 429283
      // TKs LVI-Edge Leibnizsche Regel: 431296
      // ET Komplexe Zahlen: 292971
      var assocModel4 = { "type_uri":"tub.eduzen.lecture_content", 
        "role_1":{"assoc_id":431296,"role_type_uri":"dm4.core.default"},
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

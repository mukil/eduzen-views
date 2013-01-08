/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = ""
var serviceURL = "/core"
var authorClientURL = "/eduzen/view/user/123"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")
var user = new user()

var eView = new function () {

  this.historyApiSupported = window.history.pushState
  this.user = undefined
  this.defaultLecture = 130485 // Lecture of Mathematik 1 für ChemikerInnen
  this.currentLecture = undefined
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.webResources = undefined

  /** Excercise View Application Controler **/

  this.initViews = function () {
    // This view routes on "lecture/423515/topicalarea/68429", "lecture/423515/" and "/start"

    // handling deep links
    var entryUrl = window.location.href
    entryUrl = entryUrl.substr(entryUrl.indexOf("view/") + 5)
    console.log("entry point => " + entryUrl.split("/"))
    commands = entryUrl.split("/")
    var entity = commands[0]
    var id = commands[1]
    var topicalareaId = undefined

    if (entity === "lecture") {
      console.log("lectureId set to => " + id)
      if (commands[2] === "topicalarea") {
        topicalareaId = commands[3]
      }
      eView.initLectureView(id, topicalareaId) // selected lectures is set as currentlecture, if logged in
      // lecture id is set
    } else if (entity === "start") {
      // lecture id is not set
      // ### todo: laod available lectures via "tub.eduzen.identity", implement this in uView
      eView.initLectureView()
    }
  }

  this.initLectureView = function (lectureId, topicalareaId) {
    eView.renderHeader()
    eView.setupMathJaxRenderer()
    // authentication check, if user is really participating in lecture (?)
    if (lectureId != undefined) {
      // user is logged in, check if part of this lecture, and show it
      user.loadLecturesParticipating()
      if (!eView.isParticipantOfLecture(lectureId)) {
        $("#header").append("<p class=\"buffer\"><b class=\"label\">You are not a participant of this lecture.</b></p>")
        throw new Error("Authentication failed")
      }
      eView.currentLecture = dmc.get_topic_by_id(lectureId, true)
      if (eView.currentLecture != undefined) {
        eView.renderHeader()
        eView.renderLecture()
        if (topicalareaId != undefined) {
          // ### FIXME: check access if topicalarea is really part of this lecture
          eView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
          console.log("  load also topicalarea-view for => " + topicalareaId)
          eView.webResources = eView.loadWebResourcesForTopicalarea(topicalareaId)
          eView.renderTopicalarea()
          eView.renderWebResourcesForTopicalarea()
          // load excercise-texts for this topicalarea here, instead of having subsequent render/load/render calls
          // ### eView.loadExcerciseTextsForTopicalarea()
          // ### eView.renderExcerciseText()
        } else { // render all topicalareas
          console.log("load topical areas into lecture-view of lecture => " + lectureId)
          eView.currentTopicalareas = eView.loadTopicalAreasByLV(lectureId)
          if (eView.currentTopicalareas != undefined) {
            eView.renderTopicalareas()
          }
        }
      }
    } else {
      // user is logged in, check if part of any lecture, then show any of it
      user.loadLecturesParticipating()
      if (user.lectures != undefined) {
        // eView.renderParticipatingLectures
        eView.initLectureView(user.lectures[0].id)
      } else {
        if (user.user != undefined) {
        console.log(user.user)
        // do render hint for administrative help needed, user is not participating in any lecture currently
        $("#header .title").append("<p class=\"buffer\"><b class=\"label\">Aktuell bist Du keiner Lehrveranstaltung als"
          + " Teilnehmerin bzw. Teilnehmer zugewiesen, bitte wende Dich daher einmal an unsere "
          + "<a href=\"mailto:team@eduzen.tu.berlin.de?subject=Anfrage an die Account-Redaktion von NutzerIn "
          + user.username +"\" class=\"btn\">Account-Redaktion </a> mit dem Titel der Lehrveranstaltung "
          + "f&uuml;r welche Du dich interessierst.</b></p>")
        }
      }
    }
    eView.renderMathInContentArea()
  }

  this.renderHeader = function () {
    $(".eduzen").addClass("lecture-view")
    if (user.getCurrentUser() == undefined) {
      $("#content").empty()
      user.renderLogin(eView)
      eView.renderHelpLink()
    } else {
      // authenticated..
      eView.renderUser()
      eView.renderHelpLink()
    }
  }

  this.renderHelpLink = function() {
    var mailto = "<a class=\"help-sign\" alt=\"Ihr braucht Hilfe bei einer &Uuml;bung, habt Anregungen "
      + "oder Fragen zu dieser Web-Anwendung, schickt uns Bitte eine Mail an team@eduzen.tu-berlin.de\""
      + "title=\"Ihr braucht Hilfe bei einer &Uuml;bung, habt Anregungen "
      + "oder Fragen zu dieser Web-Anwendung, schickt uns Bitte eine Mail an team@eduzen.tu-berlin.de\""
      + "href=\"mailto:team@eduzen.tu-berlin.de?subject=Frage an das eduZEN-Team&body=Hilfe mit ... "
      + "auf Seite: " + window.location.href + "... Mein Nutzername: "+ user.username +"\">?</a>"
    if ($(".help-sign")[0] == undefined) {
      $("#header").append(mailto)
    }
  }

  this.renderUser = function () {
    $(".title").html("<p class=\"buffer\">Hi <a href=\"/eduzen/view/user/" + user.user.id + "\" class=\"btn username\"> "
      + user.user.value + "</a>.&nbsp;</p>")
  }

  this.renderMathInContentArea = function () {
    // typeset all elements containing TeX to SVG or HTML in default area #content
    // MathJax.Hub.Typeset()
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }

  this.renderParticipatingLectures = function() {
    if (user.lectures != undefined) {
      $("#header").append("<div id=\"lectures-view\"><b class=\"label\">Hier eine Liste deiner Lehrveranstaltungen</b>"
        + "<br/><ul id=\"lectures\"></ul></div>")
      for (lv in user.lectures) {
        var lecture = user.lectures[lv]
        var courseName = uView.getNameOfCourse(lecture.id).items[0].value
        var item = "<li id=\"lecture\"><a class=\"btn lecturename\" href=\""
          + host +"/eduzen/view/lecture/"+ lecture.id +"\">"+ courseName +" "+ lecture.value +"</a></li>"
        $("#lectures").append(item)
      }
    } else {
      // do render hint for administrative help needed, user is not participating in any lecture currently
      $("#header").append("<div id=\"lectures-view\"><b class=\"label\">Aktuell bist Du keiner Lehrveranstaltung als"
        + " TeilnehmerIn zugewiesen, Bitte wende Dich daher einmal an unsere <a href=\"mailto:team@eduzen.tu.berlin.de?"
        + "subject=Anfrage an die Account-Redaktion von NutzerIn "+ user.username +"\" class=\"btn\">Account-Redaktion"
        + "</a> mit dem Titel der Lehrveranstaltung f&uuml;r die Du dich hier interessierst.</div>")
    }
  }

  this.renderLecture = function () {
    var courseName = eView.getNameOfCourse(eView.currentLecture.id).items[0].value
    $(".title p.buffer").append("Hier findest du &Uuml;bungen zu deiner" 
      + " Lehrveranstaltung <a href=\"/eduzen/view/lecture/" + eView.currentLecture.id
      + "\" class=\"lecturename\">"+ courseName +" / "+ eView.currentLecture.value +"</a>")
  }

  this.renderTopicalareas = function () {
    $("#header").append("<p class=\"buffer\"><b class=\"label\">Dies ist deine pers&ouml;nliche &Uuml;bersicht "
      + "&uuml;ber alle Themenkomplexe die in dieser Pr&uuml;fung abgefragt werden k&ouml;nnen</b></p>")
    if ($("#result-list").length == 0) $("#content").append("<ol id=\"result-list\"></ol>")
    eView.currentTopicalareas.sort(eView.topicLabelCompare)
    for (i = 0; i < eView.currentTopicalareas.length; i++) {
      var topicalarea = eView.currentTopicalareas[i]
      var lectureId = eView.currentLecture.id
      if (topicalarea != undefined) {
        var listItem = "<li><a href=\"/eduzen/view/lecture/" + lectureId + "/topicalarea/"
          + topicalarea.id + "\" class=\"topicalareaname\" alt=\"" + topicalarea.value + "\" title=\"Themenkomplex: "
          + topicalarea.value + "\">" + topicalarea.value + "</a></li>"
        $("#result-list").append(listItem)
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

  this.renderWebResourcesForTopicalarea = function() {
    if (eView.webResources != undefined) {
      $("#content").append("<div class=\"topicalarea-resources\"><p class=\"buffer\">"
        + "<b class=\"label\">Folgende Inhalte konnte dir die"
        + " EducationZEN-Redaktion bisher als Unterst&uuml;tzung f&uuml;r diesen Themenkomplex zusammenstellen</b>"
        + "<ul class=\"web-resources\"></ul></p></div>")
      var list = $(".topicalarea-resources .web-resources")
      for (webpage in eView.webResources) {
        var link = dmc.get_topic_by_id(eView.webResources[webpage].id)
        var name = link.composite["dm4.webbrowser.web_resource_description"].value
        var url = link.composite["dm4.webbrowser.url"].value
        list.append("<li class=\"web-resource\"><a class=\"btn\" href=\""+ url +"\" target=\"_blank\">"
          + "<img border=\"0\" src=\"/de.deepamehta.webbrowser/images/earth.png\" title=\"Externer Link:"+ name +"\" "
          + "alt=\"Externer Link:"+ name +"\">Web Resource:"+ name +"</a></li>")
      }
    }
  }


  /** Controler to take on an excercise **/

  this.showExcerciseTextForUser = function (eId, uId) {
    window.location.href = host + "/eduzen/view/lecture/" + eView.currentLecture.id
      + "/topicalarea/" + eView.currentTopicalarea.id + "/etext/" + eId
  }

  /** Exercise View Helper Methods */

  this.isParticipantOfLecture = function (lectureId) {
    for (lecture in user.lectures) {
      if (user.lectures[lecture].id == lectureId) return true
    }
    return false
  }

  this.topicLabelCompare = function(a, b) {
    // compare "a" and "b" in some fashion, and return -1, 0, or 1
    var nameA = a.value
    var nameB = b.value
    if (nameA < nameB) // sort string ascending
        return -1
    if (nameA > nameB)
        return 1
    return 0 //default return value (no sorting)
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
    var topicalareas = dmc.get_topic_related_topics(id, {"others_topic_type_uri": "tub.eduzen.topicalarea", 
      "assoc_type_uri": "tub.eduzen.lecture_content"})
    return (topicalareas.total_count > 0) ? topicalareas.items : undefined
  }

  this.loadWebResourcesForTopicalarea = function (topicalAreaId) {
    var web_resources = dmc.get_topic_related_topics(topicalAreaId, 
      {"others_topic_type_uri": "dm4.webbrowser.web_resource", "assoc_type_uri": "tub.eduzen.content_item"})
    return (web_resources.total_count > 0) ? web_resources.items : undefined
  }

  this.loadExcerciseTextsForTopicalarea = function () {
    // load association between lecture and topicalarea
    // FIXME: an ET could be many times lecture_content? as soon as we support multiple-lectures
    var contentAssociation = dmc.get_association("tub.eduzen.lecture_content", 
      eView.currentLecture.id, eView.currentTopicalarea.id, "dm4.core.default", "dm4.core.default", true)
    var excercise_texts = dmc.get_association_related_topics(contentAssociation.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items

    if (excercise_texts.length > 1) {
      $("<p class=\"buffer\"><b class=\"label\">Diese "
        + excercise_texts.length + " Aufgabenstellung/en sind notwendig, um diesen Themenkomplex abzuschlie&szlig;en"
        + "</b></p>").insertBefore("#result-list")
    } else if (excercise_texts.length == 1) {
      $("<p class=\"buffer\"><b class=\"label\">Dies ist die zu l&ouml;sende Aufgabenstellung um diesen Themenkomplex"
        + " abzuschlie&szlig;en</b></p>").insertBefore("#result-list")
    } else {
      $("<p class=\"buffer\"><b class=\"label\">Es wurden leider noch keine Aufgabenstellungen "
        + " f&uuml;r diesen Themenkomplex in deiner Lehrveranstaltung definiert.</b></p>")
        .insertBefore("#result-list")
    }
    excercise_texts.sort(eView.topicLabelCompare)
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      var excercise_text = dmc.get_topic_by_id(e_text.id, true)
      var e_text_state = eView.getExcerciseTextState(e_text.id).status
      console.log(" getting state for " + excercise_text.value + " id="+ e_text.id)
      console.log(e_text_state)
      $("#result-list").append("<li id=\"" + excercise_text.id + "\" class=\"excercise\">"
        + excercise_text.value + "<span class=\"take button\" alt=\"Ansehen\""
        + " title=\"Ansehen\">Ansehen</span><span class=\"state "+e_text_state+"\">"
        + dict.stateName(e_text_state) +"</span></li>")
      $("li#" + excercise_text.id + " .take.button").click(eView.createExcerciseTextHandler(excercise_text))
    }
    $("#result-list").addClass("excercise_texts")
  }

  this.createExcerciseTextHandler = function (e_text) {
      return function() {
        eView.showExcerciseTextForUser(e_text.id, user.user.id)
      }
  }

  this.createSomeDummyExcerciseAssocs = function () {
    if (eView.insertDummyContents) {
      console.log("\"" + user.user.value + "\" is creating associations per script to connect"
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

  this.getExcerciseTextState = function(id) {
    return dmc.request("GET", "/eduzen/state/exercise-text/" + id, undefined, undefined, undefined, false)
  }

  this.getNameOfCourse = function (lectureId) {
    return dmc.get_topic_related_topics(lectureId,
      {"others_topic_type_uri": "tub.eduzen.course", "assoc_type_uri": "dm4.core.composition"})
  }

  this.setupMathJaxRenderer = function() {
    MathJax.Ajax.config.root = host + "/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
    MathJax.Hub.Config({
        "extensions": ["tex2jax.js", "mml2jax.js", "MathEvents.js", "MathZoom.js", "MathMenu.js", "toMathML.js",
           "TeX/noErrors.js","TeX/noUndefined.js","TeX/AMSmath.js","TeX/AMSsymbols.js", "FontWarnings.js"],
        "jax": ["input/TeX", "output/SVG"], // "input/MathML", "output/HTML-CSS", "output/NativeMML"
        "tex2jax": { "inlineMath": [["$","$"],["\\(","\\)"]] },
        "menuSettings": {
            "zoom": "Double-Click", "mpContext": true, "mpMouse": true, "zscale": "200%", "texHints": true
        },
        "errorSettings": {
            "message": ["[Math Error]"]
        },
        "displayAlign": "left",
        "SVG": { "blacker": 8, "scale": 110 },
        "v1.0-compatible": false,
        "skipStartupTypeset": false,
        "elements": ["content", "header"]
    });
    MathJax.Hub.Configured() // bootstrap mathjax.js lib now
  }


}

$(window).load(eView.initViews)

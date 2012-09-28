/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var dmc = new RESTClient("http://localhost:8080/core")
var dict = new eduzenDictionary("DE")

var eView = new function () {

  this.historyApiSupported = window.history.pushState

  this.results = undefined
  this.user = undefined
  this.defaultLecture = 10848 // Mathematik 1 für ChemikerInnen
  this.currentLecture = undefined
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined

  /** excercise View application controler **/

  this.initViews = function () { 
    eView.user = eView.getCurrentUser()
    if (eView.user == undefined) {
      // ### FIXME uView.renderLogin()
    }
    // todo: registering handler
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
    $(".title").html("Hi <a href=\"/eduzen/view/user/" + eView.user.id + "\" class=\"username\"> "
      + eView.user.value + "</a>!<p><br/></p>")
  }

  this.renderLecture = function () {
    $(".title").append("Hier siehst du alles zu deiner Lehrveranstaltung <a href=\"/eduzen/view/lecture/"
      + eView.currentLecture.id + "\" class=\"lecturename\">" + eView.currentLecture.value + "</a>")
  }

  this.renderTopicalareas = function () {
    for (i = 0; i < eView.currentTopicalareas.length; i++) {
      var topicalarea = eView.currentTopicalareas[i]
      var lectureId = eView.currentLecture.id
      if (topicalarea != undefined) {
        $("#result-list").append("<li><a href=\"/eduzen/view/lecture/" + lectureId + "/topicalarea/"
          + topicalarea.id + "\" class=\"topicalareaname\">" + topicalarea.value + "</a></li>") 
      }
    }
  }

  this.renderTopicalarea = function () {
    // "<a href=\"/eduzen/view/lecture/" + lectureId + "\" class=\"back\">Zur&uuml;ck</a>"
    var backtopic = "<p class=\"buffer\"><a href=\"/eduzen/view/lecture/" + eView.currentLecture.id + "/topicalarea/"
      + eView.currentTopicalarea.id + "\" class=\"topicalareaname selected\">"
      + eView.currentTopicalarea.value + "</a></p>"
    $("#results").append(backtopic)

    // FIXME find just the related excercise_texts involved in currentLecture
    var excercise_texts = dmc.get_topic_related_topics(eView.currentTopicalarea.id, 
      { "others_topic_type_uri": "tub.eduzen.excercise_text" }).items
    for (i = 0; i < excercise_texts.length; i++) {
      var e_text = excercise_texts[i]
      var excercise_text = dmc.get_topic_by_id(e_text.id, true)
      $("#result-list").append("<li class=\"excercise\">" + excercise_text.value + "</li>")
    }
  }

  /** Controler for the search functionality **/

  this.doSearch = function (searchFor) {
    
    // eView.pushHistory({"action": "dosearch", "parameter": resultObject}, "#dosearch?for=" + searchValue)
  }

  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!eView.historyApiSupported) return
    if (state.action == "dosearch") {
      var searchValue = state.parameter.searchFor
      $("[name=searchfield]").val("" + searchValue + "")
      eView.doSearch(searchValue)
    } else if (state.action == "doshow") {
      var exId = state.parameter
      eView.showResultDetails(undefined, exId)
    }
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
    return dmc.get_topic_related_topics(id, {"others_topic_type_uri": "tub.eduzen.topicalarea"})
  }

  this.getExcercisesByTopicalarea = function(id) {
    return dmc.request("GET", "/eduzen/excercise/by_topicalarea/" + id, undefined, undefined, undefined, false)
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(eView.initViews)

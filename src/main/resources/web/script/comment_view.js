/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")

var cView = new function () {

  this.historyApiSupported = window.history.pushState

  this.user = undefined
  this.tub = undefined

  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLectureId = undefined // FIXME: move to uView, support many
  this.currentExcercise = undefined
  this.currentExcerciseObject = undefined
  this.currentApproach = undefined
  this.currentFileApproach = undefined
  // personal work history for this excercise-text
  this.allExcercises = new Array()
  this.existingComments = new Array()
  // personal state of an excercise-text can be
  // "tub.eduzen.approach_undecided" | "tub.eduzen.approach_correct" | "tub.eduzen.approach_wrong" | "new"
  this.eTextState = {"uri": "new"}


  /** Main Approach View initialization controler **/

  this.initViews = function () {
    // This view routes on "/commenting"

    // log-in check
    cView.user = cView.getCurrentUser()
    if (cView.hasEditorsMembership(cView.user.id)) {
      // ### cView.tub = cView.loadTUBIdentity()

      // handling deep links
      var entryUrl = window.location.href
      commands = entryUrl.substr(entryUrl.indexOf("view/") + 5).split("/")
      console.log("entry point => " + commands)
      var entity = commands[0]
      var excerciseId = undefined
      if (entity === "comments") {
        console.log("load commenting-view for => " + cView.user.value)
        cView.initCommentingView()
      }
    } else {
      // render notification, "no privileges to use this interface"
      console.log("Sorry, you are not privileged to use the commenting interface. Please speak to our administrator.")
    }
  }

  this.initCommentingView = function (topicalareaId, excerciseTextId) {
    cView.renderHeader()
    cView.allExcercises = cView.getAllExcercises()
    cView.renderAllExcercises()
  }

  /** Rendering Methods - Strictly Control Flow, Model Handling and View Updates **/

  this.renderHeader = function () {
    $(".eduzen").addClass("commenting-view")
    cView.renderUser()
  }

  this.renderUser = function () {
    if (cView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutze zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $("#header").hide()
      $(".info").html("Hi <a href=\"/eduzen/view/user/" + cView.user.id + "\" class=\"username\"> "
        + cView.user.value + "</a>")
    }
  }

  /** Rendering all current submissions of any user **/

  this.renderAllExcercises = function () {
    $("#header").append("<b class=\"label\">Eine Auflistung aller bisher eingereichten L&ouml;sungsvorschl&auml;ge</b>")
    $("#header").show()
    var itemList = "<ul>"
    for (item in cView.allExcercises) {
      var excercise = cView.allExcercises[item]
      var submittedAt = excercise.composite["tub.eduzen.approach"][0].composite["tub.eduzen.timeframe_note"].value
      var submitter = cView.getSubmitterOfExcercise(excercise.id).value
      itemList += "<li>" + excercise.value + "<span class=\"submitter\">"+ submitter +"</span> "
        + "<span class=\"submitted-at\">submitted "+ submittedAt +"</span></li>"
    }
    itemList += "</ul>"
    $(itemList).insertBefore("#bottom")
  }

  /** Rendering all tries for any given excercise-text and our current user **/

  this.renderExcerciseHistory = function () {
    $("#content").append("<ul id=\"taken-excercises\">")
    for (item in cView.allExcercises) {
      var excercise = dmc.get_topic_by_id(cView.allExcercises[item].id)
      var approach = excercise.composite["tub.eduzen.approach"][0] // ### FIXME: approaches should not be many here
      // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
      var listItem = "<li class=\"taken-excercise\">" 
        + "<span class=\"name\">" + approach.composite["tub.eduzen.timeframe_note"].value + "</span><br/>"
        + "<span class=\"state " + approach.composite["tub.eduzen.approach_correctness"].value
        + " \">Status: " + approach.composite["tub.eduzen.approach_correctness"].value + "</span>"
        + "<span class=\"comments\"># Kommentare</span>&nbsp;"
        + "</li>"
      $("#taken-excercises").append(listItem)
      if (cView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
    }
  }



  /** Commenting View Helpers  **/

  this.handleUploadResponse = function (response) {
    cView.currentFileApproach = response
    if (cView.currentFileApproach.file_name.indexOf("deepamehta-files") == 0) {
      return undefined // no file given
    } else {
      var fileResponseHTML = "<br/><br/>Die Datei \""
        + cView.currentFileApproach.file_name + "\" wurde zur Abgabe hochgeladen."
      $(".label.upload").append(fileResponseHTML)
      // ### allow users to delete their just accidentially uploaded file..
    }
  }

  this.hasCorrectComment = function (comments) {
    // TODO:
    for (item in cView.allExcercises) {
      var comment = dmc.get_topic_by_id(cView.allExcercises[item].id)
      console.log("         ??? hasCorrectComment=" + JSON.stringify(comment))
    }
  }

  this.hasEditorsMembership = function (userId) {
    var workspaces = dmc.get_topic_related_topics(userId, {"others_topic_type_uri": "dm4.workspaces.workspace"})
    if (workspaces.total_count > 0) {
      for (element in workspaces.items) {
        var workspace = workspaces.items[element]
        console.log("checking.. " + workspace.uri)
        if (workspace.uri === "tub.eduzen.workspace_editors") return true
      }
    }
  }



  /** Server Communications - Strictly persisting server and updating client side model **/
  /** Methods to access eduzen, deepamehta-core and accesscontrol REST-Services **/

  this.loadExistingCommentsForExcercises = function (excerciseId) {

    var excercise = dmc.get_topic_by_id(excerciseId)
    var approachId = excercise.composite["tub.eduzen.approach"][0].id
    if (excercise.composite["tub.eduzen.approach"].length > 0) {
      var comments = cView.getCommentsForApproach(approachId)
      console.log("  loaded " + comments.total_count + " comments on this taken excercise (with approachId=" + approachId + ")")
      if (comments.total_count > 0) {
        cView.existingComments = comments
        if(cView.hasCorrectComment(comments)) {
          cView.isCorrect = true
          cView.isUndecided = false
          console.log("  comments speak, this taken excercise was correct. " + excercise.id)
        }
        console.log("  comments dont speak about state of this taken excercise. " + excercise.id)
      }
    } else {
      throw new Error("The excercise was taken but no approach yet exists. That`s mad, should never happen.")
    }
  }

  this.loadExcercisesForExcerciseText = function(eTextId) {
    var usersExcercises = new Array()
    // get excercises just by this author FIXME: assemble this on the server-side
    if (!cView.tub) throw new Error("User has not a TUB Identity yet, skipping view.")
    var excercisesByUser = cView.getAllExcercisesByUser()
    // console.log("debug: user has taken " + allExcercisesByUser.total_count + " excercises in total")
    if (excercisesByUser != undefined) {
      for (element in excercisesByUser) {
        var excercise = excercisesByUser[element]
        var eTexts = dmc.get_topic_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.excercise_text",
          "assoc_type_uri": "dm4.core.aggregation"}) // eText plays "Part"-Role here
        if (eTexts.total_count > 0) { // one excercise has always just one excercise_text assigned
          // console.log("debug: filtering to excercises by user taken on this excercise-text "
            // + eTextId + "(" + eTexts.items[0].id + ")")
          if (eTextId == eTexts.items[0].id) {
            usersExcercises.push(excercise)
          }
        }
      }
      cView.allExcercises = usersExcercises
    }
  }

  this.loadTUBIdentity = function () {
    var ids = dmc.get_topic_related_topics(cView.user.id, {"others_topic_type_uri": "tub.eduzen.identity"})
    return (ids.total_count > 0) ? dmc.get_topic_by_id(ids.items[0].id, true) : undefined
  }



  /** Server Communications - Strictly returning raw data **/

  this.getAllExcercises = function () {
    // ### load all uncommented excercises.., related to a TUB-Identity (not authored in webclient), sorted by date
    var excercises = dmc.request("GET", "/eduzen/comments/all", undefined, undefined)
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getFileContent = function (topicId) {
    var files = dmc.get_topic_related_topics(topicId, {"others_topic_type_uri": "dm4.files.file", 
      "assoc_type_uri": "tub.eduzen.content_item"})
    return (files.total_count > 0) ? files.items : undefined
  }

  this.getSubmitterOfExcercise = function (eId) {
    return dmc.get_topic_related_topics(eId, {"others_topic_type_uri": "tub.eduzen.identity"}).items[0]
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }




  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!cView.historyApiSupported) return
    // do handle pop events
  }

  this.pushHistory = function (state, link) {
    if (!cView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

}

$(window).load(cView.initViews)

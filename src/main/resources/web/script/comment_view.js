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



  /** Main Approach View initialization controler **/

  this.initViews = function () {
    // This view routes on "/commenting"

    // log-in check
    cView.user = cView.getCurrentUser()
    if (cView.user == undefined) cView.renderHeader()
    if (cView.hasEditorsMembership(cView.user.id)) {
      // ### cView.tub = cView.loadTUBIdentity()

      // handling deep links
      var entryUrl = window.location.href
      commands = entryUrl.substr(entryUrl.indexOf("view/") + 5).split("/")
      console.log("entry point => " + commands)
      var entity = commands[0]
      var param = commands[1]
      var excerciseId = undefined
      if (entity === "commenting") {
        if (param === "excercise") {
          if (commands[2] != undefined) {
            excerciseId = commands[2]
            cView.currentExcercise = dmc.get_topic_by_id(excerciseId, true)
            // deep linking into excercise-info view
            cView.renderExcerciseApproachInfo()
            console.log("load approach-view for excercise => " + excerciseId)
          }
        }
        cView.initCommentingView(param, excerciseId)
      }
    } else {
      // render notification, "no privileges to use this interface"
      console.log("Sorry, you are not privileged to use the commenting interface. Please speak to our administrator.")
    }
  }

  this.initCommentingView = function (param, excerciseId) {
    cView.renderHeader()
    if (param === "excercise") {
      console.log("load commenting-view for one specific excercise.. ")
    } else if (param === "new"){
      console.log("load commenting-view just with uncommented excercises.. ")
    } else {
      console.log("load commenting-view with all excercises.. ")
      cView.allExcercises = cView.getAllExcercises()
      cView.renderAllExcercises()
    }
  }

  /** Rendering Methods - Strictly Control Flow, Model Handling and View Updates **/

  this.renderHeader = function () {
    $(".eduzen").addClass("commenting-view")
    $("#bottom").hide() // hide notification bar
    cView.renderUser()
  }

  this.renderUser = function () {
    if (cView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutze zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    }
  }

  /** Rendering all current submissions of any user **/

  this.renderAllExcercises = function () {
    $(".title").html("Hi <a href=\"/eduzen/view/user/"
        + cView.user.id + "\" class=\"btn username\"> "
        + cView.user.value + "</a><b>. Hier siehst du eine Auflistung aller unkommentierten L&ouml;sungsvorschl&auml;ge.</b>")
    $("#header").show()
    var itemList = "<ul id=\"all-excercises\">"
    $(itemList).insertBefore("#bottom")
    for (item in cView.allExcercises) {
      var excercise = cView.allExcercises[item]
      var numberOfApproaches = excercise.composite["tub.eduzen.approach"].length
      var submittedAt = excercise.composite["tub.eduzen.approach"][0].composite["tub.eduzen.timeframe_note"].value
      var submitter = cView.getSubmitterOfExcercise(excercise.id).value
      var excerciseState = dict.stateName(cView.getExcerciseState(excercise.id).excercise_state)
      var questState = dict.stateName(cView.getExcerciseState(excercise.id).quest_state)
      var itemString = "<li class=\"taken-excercise\"><div class=\"name "+ excercise.id +"\"><span class=\"submitter\">"
        + submitter +"</span><span class=\"count\">"+ numberOfApproaches +". Versuch</span>"
        + "<span class=\"state\">&Uuml;bung: "+ excerciseState +"</span>"
        + "<span class=\"quest-state\">Aufgabenstellung: "+ questState +"</span></div></li>"
      $("#all-excercises").append(itemString)
      $(".name."+ excercise.id).click(create_excercise_handler(excercise))
    }
    
    function create_excercise_handler(excercise) {
      return function () {
        cView.showExcerciseInfo(excercise.id)
      }
    }
  }

  /** 
    * Rendering all tries for any given excercise-text and our current user
    * TODO: remove duplicated code from #approach_view.renderExcerciseInfo
    */
  this.renderExcerciseApproachInfo = function () {
    var excercise = cView.currentExcercise
    var excerciseText = excercise.composite["tub.eduzen.excercise_text"]
    var excerciseDescription = excerciseText.composite["tub.eduzen.excercise_description"]
    var excerciseObject = excercise.composite["tub.eduzen.excercise_object"]
    var excerciseState = cView.getExcerciseState(excercise.id)
    // Page Header
    $(".title").html("Hi <a href=\"/eduzen/view/user/"
        + cView.user.id + "\" class=\"username\"> " + cView.user.value + "</a><b>. "
        + "Hier siehst du alle L&ouml;sungsvorschl&auml;ge die von einem/r NutzerIn zur "
        + "Aufgabenstellung \""+ excerciseText.value +"\" eingereicht wurden. "
        + "Die Aufgabenstellung ist \""+ dict.stateName(excerciseState.quest_state) + "\""
        + ", die &Uuml;bung hat den Status \"" + dict.stateName(excerciseState.excercise_state) + ".\"</b>")
    // Page Body
    $("#content").html("<b class=\"label\">Die Aufgabenstellung ist</b><br/>" + excerciseDescription.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">Aufgabe</b><br/>" + excerciseObject.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">&Uuml;bungsverlauf zur Aufgabenstellung: \""
      + excerciseText.value +"\"</b><div id=\"approach-info\"><ul class=\"approach-list\"></ul></div>")
    var approaches = excercise.composite["tub.eduzen.approach"]
    // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
    var numberOfApproach = 1;
    for (item in approaches ) {
      var approach = approaches[item]
      var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
      var state = approach.composite["tub.eduzen.approach_correctness"].value
      var content = approach.composite["tub.eduzen.approach_content"].value
      var comments = cView.getCommentsForApproach(approach.id)
      var approachLink = excercise.id +"/approach/"+ approach.id
      // Page Item
      var commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Neues Kommentar verfassen\""
        + "title=\"Neues Kommentar verfassen\">Neues Kommentar verfassen</a>"
      if (comments.total_count > 0) {
        commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Alle Kommentare anzeigen\""
        + "title=\"Alle Kommentare anzeigen\">Alle Kommentare anzeigen</a>"
      }
      var listItem = "<li class=\"approach\">"
          + "<span class=\"submitted\">"+ numberOfApproach +". Versuch, eingereicht um <a id=\""+ approach.id +"\" href=\""
            + approachLink +"\">"+ timestamp +"</a></span>"
          + "<span class=\"state "+ state + "\">Status: "+ state +"</span><br/>"
          + "<div class=\"content\">"+ content +"</div>"
          + "<span class=\"comments\">"+ commentsLink +"</span>"
        + "</li>"
      $(".approach-list").html(listItem)
      $(".btn."+ approach.id +".comment").click(create_comment_handler(approach))
      if (cView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
    }

    function create_comment_handler (approach) {
      return function(e) {
        cView.renderCommentsForApproach(approach)
        cView.renderCommentFormForApproach(approach)
      }
    }
  }

  this.renderCommentsForApproach = function(approach) {
    console.log("   rendering all comments for approach .. ")
    $("#content").append("<ul id=\"comment-list\">")
    $("#comment-list").empty()
    var comments = cView.getCommentsForApproach(approach.id)
    if (comments.total_count > 0) {
      cView.existingComments = comments
      for (c in comments.items) {
        var comment = dmc.get_topic_by_id(comments.items[c].id, true)
        var author = cView.getAuthorOfComment(comment.id).items[0]
        var explanation = comment.composite["tub.eduzen.comment_explanation"].value
        author = (author == undefined) ? author = "anonymus" : author.value
        var commentView = "<li class=\"comment\">"+ author +" sagt der Vorschlag ist "
          + dict.stateName(comment.value) +"<br/>"
          + explanation +"</li>"
        $("#comment-list").append(commentView)
      }
    }
  }

  this.renderCommentFormForApproach = function(approach) {
    $("#new-comment").remove()
    var form = "<div id=\"new-comment\"><b class=\"label\">Inhalt deines Kommentars</b>"
      + "<form name=\"comment\" id=\"new-comment-form\" action=\"javascript:void(0);\">"
      + "<input class=\"inputfield\" type=\"text\" size=\"80\" rows=\"4\"></input><br/>"
      + "<label for=\"is-correct\">Den L&ouml;sungsvorschlag find ich korrekt"
      + "<input class=\"is-correct\" name=\"is-correct\" type=\"checkbox\"></input></label>"
      + "<input class=\"btn comment\" type=\"submit\" value=\"Kommentieren\"></input>"
      + "</form></div>"
    $("#content").append(form)
    $("#new-comment-form").submit(do_comment_handler(approach))

    function do_comment_handler(approach) {
      return function() {
        var correctness = $("#new-comment-form .is-correct").is(":checked")
        var value = $("#new-comment-form .inputfield").val()
        cView.doCommentApproach(approach, value, correctness)
      }
    }
  }

  this.showExcerciseInfo = function (eId, uId) {
    window.location.href = host + "/eduzen/view/commenting/excercise/" + eId
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

  this.doCommentApproach = function(approach, value, isCorrect) {
    // ### FIXME: recheck for still-existing user
    console.log(" do comment this approiach wiht " + value)
    // ### FIXME: strip input to API.. ;)
    var newComment = { "type_uri": "tub.eduzen.comment", "composite": {
        "tub.eduzen.comment_correct": isCorrect,
        "tub.eduzen.comment_explanation": value
    }}
    var savedComment = dmc.create_topic(newComment)
    if (savedComment == undefined) throw new Error("Something mad happened.")
    var commentApproachModel = { "type_uri":"dm4.core.composition", 
      "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.part"}
    }
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":cView.user.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(commentApproachModel)
    dmc.create_association(authorModel)
    console.log("    saved comment => " + isCorrect + "  approach: " + approach.id + " for author: " + cView.user.value)
    cView.renderExcerciseApproachInfo()
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

  this.getExcerciseState = function(excerciseId) {
    return dmc.request("GET", "/eduzen/state/exercise/"+ excerciseId, undefined, undefined, undefined, false)
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getAuthorOfComment = function (commentId) {
    return dmc.get_topic_related_topics(commentId,
      {"others_topic_type_uri": "dm4.accesscontrol.username", "assoc_type_uri": "tub.eduzen.author"})
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

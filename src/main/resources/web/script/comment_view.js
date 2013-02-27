/**
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = ""
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")
var user = new user()

var cView = new function () {

  this.historyApiSupported = window.history.pushState

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
  this.currentSampleSolution = undefined



  /** Main Approach View initialization controler **/

  this.initViews = function () {
    // This view routes on "/commenting"
    cView.renderHeader() // should trow error if user.user is unset

    if (cView.hasEditorsMembership(user.user.id)) {

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
          }
        }
        cView.initCommentingView(param, excerciseId)
      }
    } else {
      // render notification, "no privileges to use this interface"
      alert("Authentication Erro", "Sorry, your user account is not privileged to use the interface for editors."
        +" Please speak to our administrator.")
      console.log("Sorry, you are not privileged to use the commenting interface. Please speak to our administrator.")
    }
  }

  this.initCommentingView = function (param, excerciseId) {
    cView.renderHeader() // login check
    if (param === "excercise") {
      cView.setupMathJaxRenderer()
      console.log("load approach-view for excercise => " + excerciseId)
      $("#menu").hide()
      cView.currentExcercise = dmc.get_topic_by_id(excerciseId, true)
      cView.renderExcerciseApproachInfo()
      cView.currentExcerciseText = cView.currentExcercise.composite["tub.eduzen.excercise_text"]
      if (cView.isSampleApproachAvailable(cView.currentExcerciseText.id)) {
        cView.renderSampleSolutionForExcerciseText()
      }
      cView.renderMathInContentArea()
    } else if (param === "new") {
      console.log("load commenting-view with all excercises having just one uncommented approach..")
      $("#menu").show()
      $("a.new").addClass("selected")
      $("a.inprogress, a.unapproached, a.all").removeClass("selected")
      $("#header").append("<div class=\"runner\"></div>")

      setTimeout(function(e) {
        cView.allExcercises = cView.getAllNewExcercises()
        cView.renderAllExcercises()
      }, 100)

    } else if (param === "inprogress") {
      console.log("load commenting-view with all excercises having at least one approach uncommented.. ")
      $("#menu").show()
      $("a.inprogress").addClass("selected")
      $("a.new, a.unapproached, a.all").removeClass("selected")
      $("#header").append("<div class=\"runner\"></div>")

      setTimeout(function(e) {
        cView.allExcercises = cView.getAllExcercisesWorkNeeded()
        cView.renderAllExcercises()
      }, 100)

    } else if (param === "unapproached") {
      console.log("load commenting-view with all excercises missing an approach.. ")
      $("#menu").show()
      $("a.unapproached").addClass("selected")
      $("a.new, a.inprogress, a.all").removeClass("selected")
      $("#header").append("<div class=\"runner\"></div>")

      setTimeout(function(e) {
        cView.allExcercises = cView.getAllExcercisesNotApproached()
        cView.renderUnapproachedExcercises()
      }, 100)

    } else if (param === "all") {
      console.log("load commenting-view with all excercises having at least one approach uncommented.. ")
      $("#menu").show()
      $("a.all").addClass("selected")
      $("a.new, a.inprogress, a.unapproached").removeClass("selected")
      $("#header").append("<div class=\"runner\"></div>")

      setTimeout(function(e) {
        cView.allExcercises = cView.getAllExcercisesTaken()
        cView.renderAllExcercises()
      }, 100)

    }
  }

  /** Rendering Methods - Strictly Control Flow, Model Handling and View Updates **/

  this.renderHeader = function (page) {
    $(".eduzen").addClass("commenting-view")
    $("#bottom").hide() // hide notification bar
    if (user.getCurrentUser() == undefined) {
      user.renderLogin(cView)
      throw new Error("Unauthenticated. Please login first.")
    } else {
      // cView.renderPageTitle(page)
      cView.renderMenu()
    }
  }

  this.renderMenu = function () {
    /** "<a class=\"new\" href=\""+ host +"/eduzen/view/commenting/new\">Neue &Uuml;bungen</a>" **/
    $("#menu").html("<a class=\"inprogress\" href=\""+ host +"/eduzen/view/commenting/inprogress\">"
      + "wartend auf Kommentar</a>"
      + "<a class=\"unapproached\" href=\""+ host +"/eduzen/view/commenting/unapproached\">ohne L&ouml;sungsversuch</a>"
      + "<a class=\"all\" href=\""+ host +"/eduzen/view/commenting/all\">Alle &Uuml;bungen</a>")
  }

  this.renderMathInContentArea = function () {
    // typeset all elements containing TeX to SVG or HTML in default area #content
    MathJax.Hub.Typeset()
  }

  this.getFeedbackOverviewUrl = function () {
    return host + "/eduzen/view/commenting/new"
  }

  /** Rendering all current submissions of any user **/

  this.renderAllExcercises = function () {
    $(".title").append("<p class=\"buffer\">Hi <a href=\"/eduzen/view/user/" + user.user.id + "\" class=\"btn username\"> "
        + user.user.value + "</a><b>. Hier ist die &Uuml;bersicht zu allen angefangenen &Uuml;bungen.</b></p>")
    var itemList = "<ul id=\"all-excercises\">"
    $(itemList).insertBefore("#bottom")
    for (item in cView.allExcercises) { // we are currently at 2 ajax requests per result item (author & state)
      var excercise = cView.allExcercises[item]
      var numberOfApproaches = excercise.composite["tub.eduzen.approach"].length
      var submittedAt = excercise.composite["tub.eduzen.approach"][0].composite["tub.eduzen.timeframe_note"].value
      var exercise_text_name = excercise.composite["tub.eduzen.excercise_text"].value
      var submitter = cView.getSubmitterOfExcercise(excercise.id).value
      var status = cView.getExcerciseState(excercise.id)
      var excerciseState = dict.stateName(status.excercise_state)
      var questState = dict.stateName(status.quest_state)
      var itemString = "<li class=\"taken-excercise\"><div class=\"name "+ excercise.id +"\"><span class=\"submitter\">"
        + submitter +"</span>&nbsp;&nbsp;&nbsp;<span class=\"count\">"+ numberOfApproaches +". Versuch</span>"
        + "<span class=\"state\">&Uuml;bung: "+ excerciseState +"</span>"
        + "<span class=\"quest-state\">Aufgabenstellung: \""+ exercise_text_name
        +"\" "+ questState +"</span></div></li>"
      $("#all-excercises").append(itemString)
      $(".name."+ excercise.id).click(create_excercise_handler(excercise))
    }
    $("#header .runner").remove()

    function create_excercise_handler(excercise) {
      return function () {
        cView.showExcerciseInfo(excercise.id)
      }
    }
  }

  this.renderUnapproachedExcercises = function () {
    $(".title").append("<p class=\"buffer\">Hi <a href=\"/eduzen/view/user/" + user.user.id + "\" class=\"btn username\"> "
        + user.user.value + "</a><b>. Hier ist eine &Uuml;bersicht zu allen angefangenen &Uuml;bungen.</b></p>")
    var itemList = "<ul id=\"all-excercises\">"
    $(itemList).insertBefore("#bottom")
    for (item in cView.allExcercises) { // we are currently at 2 ajax requests per result item (author & state)
      var excercise = cView.allExcercises[item]
      var submitter = cView.getSubmitterOfExcercise(excercise.id).value
      var status = cView.getExcerciseState(excercise.id)
      var excerciseState = dict.stateName(status.excercise_state)
      var questState = dict.stateName(status.quest_state)
      var itemString = "<li class=\"taken-excercise\"><div class=\"name "+ excercise.id +"\"><span class=\"submitter\">"
        + submitter +"</span>&nbsp;&nbsp;&nbsp;<span class=\"count\">Keine Versuche</span>"
        + "<span class=\"state\">&Uuml;bung: "+ excerciseState +"</span>"
        + "<span class=\"quest-state\">Aufgabenstellung: "+ questState +"</span></div></li>"
      $("#all-excercises").append(itemString)
      $(".name."+ excercise.id).click(create_excercise_handler(excercise))
    }
    $("#header .runner").remove()

    function create_excercise_handler(excercise) {
      return function () {
        cView.showExcerciseInfo(excercise.id)
      }
    }
  }

  this.renderSampleSolutionForExcerciseText = function() {
    // FIXME: load sample solution for excercise-text, not part of this lecture, but part of the topicalarea
    if (cView.currentSampleSolution != undefined) {
      var e_text = cView.currentExcerciseText
      var e_text_descr = e_text.composite["tub.eduzen.excercise_description"].value
      var sample_content = cView.currentSampleSolution.composite["tub.eduzen.approach_content"].value
      var exampleHtml = "<br/><br/><b class=\"label\">Lieber Tutor, liebe Tutorin</b><br/><div id=\"sample-solution\">"
        + "<b class=\"label\">Hier ist eine Musterl&ouml;sung zu dieser Aufgabenstellung</b><br/><br/>"
        + sample_content  +"</b><br/><br/></div>"
      $("#content").append(exampleHtml)
    }
  }

  /**
    * Rendering all tries for any given excercise-text and our current user
    * TODO: remove duplicated code from #approach_view.renderExcerciseInfo
    */
  this.renderExcerciseApproachInfo = function () {
    $(".runner").hide()
    var excercise = cView.currentExcercise
    var excerciseText = excercise.composite["tub.eduzen.excercise_text"]
    var excerciseDescription = excerciseText.composite["tub.eduzen.excercise_description"]
    var excerciseObject = excercise.composite["tub.eduzen.excercise_object"]
    var excerciseState = cView.getExcerciseState(excercise.id)
    // Page Header
    $(".title").html("<p class=\"buffer\">Hi <a href=\"/eduzen/view/user/"
        + user.user.id + "\" class=\"username\"> "+ user.user.value +"</a><b class=\"label\">. "
        + "Hier siehst du alle L&ouml;sungsvorschl&auml;ge von \""+ user.identity.value +"\" zur "
        + "&Uuml;bung der Aufgabenstellung \""+ excerciseText.value +"\". "
        + "Die Aufgabenstellung ist <span class=\"darkstate\">\""+ dict.stateName(excerciseState.quest_state)
        + "\"</span>, die &Uuml;bung ist <span class=\"darkstate\">\""+ dict.stateName(excerciseState.excercise_state)
        +".\"</span></b><a class=\"btn back\" href=\""+ cView.getFeedbackOverviewUrl()
        +"\">Zur&uuml;ck zur &Uuml;bersicht</a></p>")
    // Page Body
    $("#content").html("<b class=\"label\">Aufgabenstellung</b><br/>" + excerciseDescription.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">Aufgabe</b><br/>" + excerciseObject.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">&Uuml;bungsverlauf</b>"
        + "<div id=\"approach-info\"><ul class=\"approach-list\"></ul></div>")
    var approaches = excercise.composite["tub.eduzen.approach"]
    // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
    var numberOfApproach = 1;
    for (item in approaches) {
      var approach = approaches[item]
      var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
      // var state = approach.composite["tub.eduzen.approach_correctness"].value
      var state = cView.getApproachState(approach.id).status
      var content = approach.composite["tub.eduzen.approach_content"].value
      var comments = cView.getCommentsForApproach(approach.id)
      // Page Item
      var commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Feedback geben\""
        + "title=\"Feedback geben\">Feedback geben</a>"
      if (comments.total_count > 0) {
        commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Feedback anzeigen\""
        + "title=\"Feedback anzeigen\">Feedback anzeigen</a>"
      }
      var time = new Date(parseInt(timestamp))
      var dateString = time.toLocaleDateString() + ", um " + time.getHours() + ":" + time.getMinutes() + " Uhr"
      var listItem = "<li class=\"approach\"><div class=\"approach-"+ numberOfApproach +"\">"
          + "<span class=\"submitted\">"+ numberOfApproach +". Versuch, eingereicht am "+ dateString
          +"&nbsp;</span><b class=\"label\">ist <span class=\"darkstate\">\""+ dict.stateName(state) +"\"</span><br/>"
          + "<div class=\"content\">"+ content +"</div>"
          + "<span class=\"comments\">"+ commentsLink +"</span></div>"
        + "</li>"
      $(".approach-list").append(listItem)
      $(".btn."+ approach.id +".comment").click(create_comment_handler(approach, numberOfApproach))
      var attachment = cView.getFileContent(approach.id)
      if (attachment != undefined) {
        cView.renderFileAttachment(approach.id, attachment[0], numberOfApproach)
      }
      numberOfApproach++
    }

    function create_comment_handler (approach, numberOfApproach) {
      return function(e) {
        cView.renderCommentsForApproach(approach, numberOfApproach)
        cView.renderCommentFormForApproach(approach, numberOfApproach)
      }
    }
  }

  this.renderCommentsForApproach = function(approach, numberOfApproach) {
    $(".approach-"+ numberOfApproach).append("<ul id=\"comment-list\">")
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
    cView.renderMathInContentArea()
  }

  this.renderCommentFormForApproach = function(approach, numberOfApproach) {
    $("#new-comment").remove()
    var form = "<div id=\"new-comment\"><b class=\"label\">Inhalt deines Kommentars</b>"
      + "<form name=\"comment\" id=\"new-comment-form\" action=\"javascript:void(0);\">"
      + "<div id=\"comment-area\">"
        + "<textarea class=\"inputfield\" name=\"comment-input\" type=\"text\" size=\"120\" rows=\"4\">"
        + "</textarea>"
        + "<div id=\"preview-area\"><b class=\"label preview\" style=\"display: none;\">Vorschau</b>"
        + "<div id=\"math-preview\" class=\"math\"></div></div><br/>"
      + "</div>"
      + "<label for=\"is-correct\">Den L&ouml;sungsvorschlag find ich korrekt"
      + "<input class=\"is-correct\" name=\"is-correct\" type=\"checkbox\"></input></label>"
      + "<input class=\"btn comment\" type=\"submit\" value=\"Kommentieren\"></input>"
      + "</form></div>"
    $(".approach-"+ numberOfApproach).append(form)
    $("#new-comment-form").submit(do_comment_handler(approach))

    // mathjax preview handling
    $input = $("[name=comment-input]")
    $(".label.preview").show()
    $input.keyup(function(e) {
      cView.renderApproachMathPreview($input.val())
      return function(){}
    })

    function do_comment_handler(approach) {
      return function() {
        var correctness = $("#new-comment-form .is-correct").is(":checked")
        var value = $("#new-comment-form .inputfield").val()
        cView.doCommentApproach(approach, value, correctness)
      }
    }
  }

  this.renderApproachMathPreview = function(value) {
    $("#math-preview").text(value)
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }

  this.renderFileAttachment = function(approachId, attachment, numberOfApproach) {
    // var icon = host + "/de.deepamehta.files/images/sheet.png"
    var img = host + "/filerepo/uebungen/" + attachment.value
    // var iconSrc = "<img src=\""+ icon +"\" alt=\"Document: "+ attachment.value +"\" title=\"Document: "+ attachment.value +"\" class=\"file-icon\">"
    var fileSrc = "<img src=\""+ img +"\" alt=\"Document: "+ attachment.value +"\" title=\"Document: "+ attachment.value +"\" class=\"file-icon\">"
    // $(".approach-"+ numberOfApproach).append(iconSrc)
    $(".approach-"+ numberOfApproach + " .content").append(fileSrc)
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
        if (workspace.uri === "de.workspaces.deepamehta") return true // default workspace uri changed with 4.0.14
      }
    }
  }

  this.isSampleApproachAvailable = function (eTextId) {
    // fixme: needs a server side method to better select sample-solutions for an excercise-text
    var excercises = dmc.get_topic_related_topics(eTextId, {"others_topic_type_uri": "tub.eduzen.excercise"})
    if (excercises.total_count > 0) { // FIXME: optimize on server-side
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
                cView.currentSampleSolution = approach
                return true
              }
            }
          }
        }
      }
    }
    return false
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
      "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.parent"},
      "role_2":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.child"}
    }
    var authorModel = { "type_uri":"tub.eduzen.author",
      "role_1":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":user.identity.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(commentApproachModel)
    dmc.create_association(authorModel)
    console.log("    saved comment => " + isCorrect + "  approach: " + approach.id + " for author: " + user.user.value)
    cView.renderExcerciseApproachInfo()
  }

  this.loadExcercisesForExcerciseText = function(eTextId) {
    var usersExcercises = new Array()
    // get excercises just by this author FIXME: assemble this on the server-side
    if (!user.identity) {
      user.renderLogin(cView)
      throw new Error("Your user account has no TUB Identity. Please speak to our administrator.")
    }
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



  /** Server Communications - Strictly returning raw data **/

  this.getAllExcercisesTaken = function () {
    // load all excercises with at least one approach ### sorted by date
    var excercises = dmc.request("GET", "/eduzen/exercises/all", undefined, undefined)
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getAllExcercisesNotApproached = function () {
    // load all excercises yet un-approached ### sorted by date
    var excercises = dmc.request("GET", "/eduzen/exercises/unapproached", undefined, undefined)
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getAllNewExcercises = function () {
    // load all excercises with just one un-commented approach ### sorted by date
    var excercises = dmc.request("GET", "/eduzen/exercises/new", undefined, undefined)
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getAllExcercisesWorkNeeded = function () {
    // load all excercises with at least one un-commented approach ### sorted by date
    var excercises = dmc.request("GET", "/eduzen/exercises/inprogress", undefined, undefined)
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getExcerciseState = function(excerciseId) {
    return dmc.request("GET", "/eduzen/state/exercise/"+ excerciseId, undefined, undefined, undefined, false)
  }

  this.getApproachState = function(approachId) {
    return dmc.request("GET", "/eduzen/state/approach/"+ approachId, undefined, undefined, undefined, false)
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getAuthorOfComment = function (commentId) {
    return dmc.get_topic_related_topics(commentId,
      {"others_topic_type_uri": "tub.eduzen.identity", "assoc_type_uri": "tub.eduzen.author"})
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
        "elements": ["content"]
    });
    MathJax.Hub.Configured() // bootstrap mathjax.js lib now
  }

}

$(window).load(cView.initViews)

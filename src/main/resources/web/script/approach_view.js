/**
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = ""
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")
var user = new user()

var aView = new function () {

  this.historyApiSupported = window.history.pushState
  this.ui = undefined

  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLectureId = undefined // FIXME: move to uView, support many
  this.currentExcercise = undefined
  this.currentExcerciseObject = undefined
  this.sampleExcerciseText = undefined
  this.sampleApproach = undefined
  // an excercise can haz many approaches, so this is only set if _one_ approach is in detail-view
  this.currentApproach = undefined
  this.currentFileApproach = undefined
  // personal work history for this excercise-text
  this.hasExerciseHistory = false
  this.hasSampleSolution = false
  this.webResources = undefined
  this.allExcercises = new Array()
  this.existingComments = new Array()
  // personal state of an excercise-text can be
  // "tub.eduzen.approach_undecided" | "tub.eduzen.approach_correct" | "tub.eduzen.approach_wrong" | "new"
  this.eTextState = {"uri": "new"}
  this.userInput = "" // CKEditor data-body container



  /** Main Approach View initialization controler **/

  this.initViews = function () {
    // This view routes on "lecture/*/topicalarea/*/etext/*" and "/submissions"
    // consider: is topicalarea, and lecture really necessary here?

    aView.ui = new GUIToolkit() // used to create new upload-dialog

    var entryUrl = window.location.href
    // handling routes
    commands = entryUrl.substr(entryUrl.indexOf("view/") + 5).split("/")
    console.log("entry point => " + commands)
    aView.currentLectureId = commands[1]
    var entity = commands[2]
    var topicalareaId = commands[3]
    var excerciseTextId = undefined
    var excerciseId = undefined
    var subView = undefined
    if (entity === "topicalarea") {
      console.log("load topicalarea-view for => " + topicalareaId)
      if (commands[4] === "etext") {
        excerciseTextId = commands[5]
        console.log("  load excercise-text-view for => " + excerciseTextId)
        if (commands[6] === "excercise") {
          excerciseId = commands[7]
          console.log("  load excercise-view for => " + excerciseId)
        } else if (commands[6] === "new") {
          console.log("  load new excercise-view for => " + excerciseTextId)
          subView = "new"
        }else if (commands[6] === "sample") {
          console.log("  load sample exercise-view for => " + excerciseTextId)
          subView = "sample"
        } else if (commands[6] === "history") {
          subView = "history"
          console.log("  load exercise-history-view for => " + excerciseTextId)
        } else if (commands[6] === "submitted") {
          subView = "submitted" // virtual state to prevent refreshing accidentially the new page
        }
      }
      if (!aView.currentLectureId) throw new Error("No current Lecture was set. Try to log out and log in again.")
      // initializing client side model for topicalarea, excercise-text and possibly an excercise
      aView.registerPopState()
      aView.initApproachView(topicalareaId, excerciseTextId, excerciseId, subView)
    } else if (commands[0] === "submissions") {
      console.log("NOT YET IMPLEMENTED: why not load all submitted approachs and comments to it..")
      // ### load all submissions by user..
      aView.initSubmissionsView()
    }
  }

  this.initApproachView = function (topicalareaId, excerciseTextId, excerciseId, subViewId) {
    if (topicalareaId != undefined) {
      aView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
      // ### FIXME: check access if topicalarea is really part of this lecture
      // ### render general infos for topicalarea
      if (excerciseTextId != undefined) {

        aView.setupMathJaxRenderer()
        aView.currentExcerciseText = dmc.get_topic_by_id(excerciseTextId, true)

        if (excerciseId != undefined) {
          // do exercise history view
          aView.currentExcercise = dmc.get_topic_by_id(excerciseId, true)
          // ### handle linking into: if user has already taken this excercise-text but not submitted an approach yet.
          console.log(" linking into excercise approach overview, fetch approach-history")
          if (aView.renderHeader("excercise")) {
            aView.renderExcerciseApproachInfo()
          }
        } else {
          console.log(" linking into excercise-text overview / subView " + subViewId)
          // ### FIXME: check access if excercise text is really part of this topicalare in this lecture
          if (aView.renderHeader("excercise-text")) {
            // render excercise-text
            aView.renderExcerciseTextTakeOn()
            // ### and abutton to our excercise-history, if present
            // ### if our user had already the joy to meet this excercise-text, present links to his/her excercise
            aView.loadExcercisesForExcerciseText(excerciseTextId) // sets aView.hasExerciseHistory implicitly
            aView.hasSampleSolution = aView.isSampleApproachAvailable(excerciseTextId)
            console.log("   hasSampleSolution:" + aView.hasSampleSolution
              + " hasUserHistory: " + aView.hasExerciseHistory)
            // append subView
            if (subViewId === "sample") {
              // render "complete sample solution with get exercise button"
              if (aView.hasSampleSolution) {
                aView.renderSampleSolutionForExcerciseText()
                // render page with somekind of "now its your turn"-button
              }
            } else if (subViewId === "history") {
              if (aView.allExcercises.length > 0) {
                aView.renderExcerciseHistoryForUser()
              } // else render: you`ve not tried this quest yet
            } else if (subViewId === "new") {
              aView.handleNewExcercise()
            } else if (subViewId === "submitted") {
              aView.renderOptionsAfterSubmission()
            } else if (subViewId == undefined) {
              // start view / overview for an exercise-text / load contents if available
              aView.webResources = aView.loadWebResourcesForExerciseText(aView.currentExcerciseText.id)
              aView.renderOptionsForQuest()
            }
          }
        }

      } else {
        // ### or all other excercises from within our current topicalarea
        // aView.renderAllExcercises()
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

  this.initSubmissionsView = function () {
    if (aView.allExcercises) {
      aView.renderAllExcercisesList()
    }
  }



  /** Rendering Methods - Strictly Control Flow, Model Handling and View Updates **/

  this.renderHeader = function (page) {
    $(".eduzen").addClass("approach-view")
    $("#bottom").hide() // hide notification bar
    if (user.getCurrentUser() == undefined) {
      $("#content").empty()
      user.renderLogin(aView)
      return false
    } else {
      // authenticated..
      aView.renderUser()
      aView.renderPageTitle(page)
      aView.renderHelpLink()
    }
    return true
  }

  this.renderUser = function () {
    $(".title").html("<p class=\"buffer\">Hi <a href=\"/eduzen/view/user/"
      + user.user.id + "\" class=\"btn username\"> "+ user.user.value +"</a>.&nbsp;</p>")
  }

  this.renderPageTitle = function (page) {
    if (page === "excercise-text") {
      var excerciseTextName = aView.currentExcerciseText.value
      var tpName = aView.currentTopicalarea.value
      $(".title p.buffer").append("Du kannst so viele &Uuml;bungen einreichen wie du m&ouml;chtest, sobald eine im "
        + "1. Versuch korrekt ist, ist die Aufgabenstellung gel&ouml;st.&nbsp;"
        + "<b class=\"label\">Du schaust gerade auf die Aufgabenstellung <span class=\"excercise-text selected\""
        + "title=\"Link zu dieser Aufgabenstellung\">"+ excerciseTextName +"</span> im Themenkomplex</b> "
        + "<a href=\"/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/"
        + aView.currentTopicalarea.id + "\" class=\"topicalareaname\" title=\"Themenkomplex: "
        + tpName + "\" alt=\"" + tpName + "\">" + tpName + "</a><br/>")
    } else if (page === "excercise") {
      var excerciseState = aView.getExerciseState(aView.currentExcercise.id)
      $(".title p.buffer").append("<b>Der aktuelle Themenkomplex ist"
        + "<a class=\"topicalareaname selected\" href=\""+ aView.getTopicalareaUrl() +"\">"
        + aView.currentTopicalarea.value +"</a><br/>Die Aufgabenstellung <a class=\"excercise-text selected\" href=\""
        + aView.getExcerciseTextUrl() +"\">"+ aView.currentExcerciseText.value +"</a>"
        + " ist <span class=\"darkstate\">\"" + dict.stateName(excerciseState.quest_state) + "\"</span>"
        + ", die &Uuml;bung hat den Status <span class=\"darkstate\">\""
        + dict.stateName(excerciseState.excercise_state) + "\"</span>.</b><br/>")
      .append("<b class=\"label\">Hier siehst du all deine L&ouml;sungsversuche f&uuml;r diese &Uuml;bung</b>")
    }
  }

  this.renderHelpLink = function() {
    var mailto = "<a class=\"help-sign\" alt=\"Ihr braucht Hilfe bei einer &Uuml;bung, habt Anregungen "
      + "oder Fragen zu dieser Web-Anwendung, schickt uns Bitte eine Mail an team@eduzen.tu-berlin.de\""
      + "title=\"Ihr braucht Hilfe bei einer &Uuml;bung, habt Anregungen "
      + "oder Fragen zu dieser Web-Anwendung, schickt uns Bitte eine Mail an team@eduzen.tu-berlin.de\""
      + "href=\"mailto:team@eduzen.tu-berlin.de?subject=Frage an das EducationZEN-Team&body=Hilfe mit ... "
      + "E-Link: "+ aView.getExcerciseTextUrl() + "... T-Link:" + aView.getTopicalareaUrl() + " ... "
      + " Mein Nutzername: "+ user.username +"\">?</a>"
    if ($(".help-sign")[0] == undefined) {
      $("#header").append(mailto)
    }
  }

  this.renderMathInContentArea = function () {
    // typeset all elements containing TeX to SVG or HTML in default area #content
    // MathJax.Hub.Typeset()
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }

  this.renderExcerciseTextTakeOn = function () {
    // Status der Aufgabenstellung nur rendern, wenn es schon eine &Uuml;bung dazu gibt.
    aView.renderExcerciseTextDescription()
    //
    // add "assemble exercise" button
    $("#content").append("<br/><a class=\"button takeon\" href=\"javascript:aView.handleNewExcercise()\" alt=\""
      + " Aufgabenstellung annehmen\" title=\"Aufgabenstellung annehmen\">Aufgabenstellung annehmen</a><br/><br/>")
  }

  this.renderExcerciseTextDescription = function () {
    var eName = aView.currentExcerciseText.value
    var eText = aView.currentExcerciseText.composite["tub.eduzen.excercise_description"].value
    $("#content").append("<b class=\"label excercise-text\">Ok, hier ist deine Aufgabenstellung</b><br/><br/>")
      .append("<div class=\"excercise-text\">" + eText + "</div>")
  }

  this.renderSampleSolutionForExcerciseText = function() {
    // FIXME:server-side: load sample solution for excercise-text, not part of this lecture, but part of the topicalarea
    if (aView.sampleExercise != undefined) {
      var e_text_simple_value = aView.sampleExercise.composite["tub.eduzen.excercise_text"].value
      var e_text_description = aView.sampleExercise.composite["tub.eduzen.excercise_text"]
        .composite["tub.eduzen.excercise_description"].value
      var e_object = aView.sampleExercise.composite["tub.eduzen.excercise_object"].value
      var sample_content = aView.sampleExercise.composite["tub.eduzen.approach"][0] // ### sample-solution at 1.Approach
        .composite["tub.eduzen.approach_content"].value
      var overviewLink = "<a class=\"btn back\" title=\"Zur&uuml;ck zur Aufgabenstellung\" "
        + "href=\""+ aView.getExcerciseTextUrl()+ "\">Zur&uuml;ck zur Aufgabenstellung</a>"
      var historyLink = ""
      if (aView.hasExerciseHistory) {
        historyLink = "<a class=\"btn new\" title=\"&Uuml;bungsverlauf ansehen\" "
          + "href=\""+ aView.getExcerciseTextUrl()+ "/history\">&Uuml;bungsverlauf ansehen</a>"
      }
      var newLink = "<a class=\"btn new\" title=\"Neue &Uuml;bung starten\" "
        + "href=\""+ aView.getExcerciseTextUrl()+ "/new\">Neue &Uuml;bung starten</a>"
      var exampleHtml = "<div id=\"sample-solution\"><b class=\"label\">Hier ein Beispiel zur "
        + "Aufgabenstellung \""+ e_text_simple_value +"\"</b>&nbsp;"+ overviewLink +"<br/><br/>"
        + e_text_description +"<b class=\"label\">"
        + " <br/><br/>Mit der Aufgabe</b><br/>"+ e_object  +"</b><br/><br/></div><b class=\"label\">Und "
        + " hier ist der dazugeh&ouml;rige L&ouml;sungsansatz</b><br/><br/>"+ sample_content  +"</b><br/><br/></div>"
        + "<br/>" + overviewLink + historyLink +  newLink + "<br/>"
      $("#content").html(exampleHtml)

    }
  }

  this.renderApproachForm = function  () {
    var uploadPath = "/"
    // ###
    var submissionLabel = "<label for=\"excercise-input\">Bitte trage deinen L&ouml;sungsansatz oder "
      + "deine Frage an die Tutoren in das Eingabefeld ein:<br/></label><br/><br/><br/>"

    var submission = "<section id=\"input\" contenteditable=\"true\"></section><br/>"
      + "<form name=\"approach-submission\" action=\"javascript:aView.submitApproachToExcercise()\">"
      /**
      + "<textarea type=\"text\" name=\"excercise-input\" rows=\"4\" size=\"120\"></textarea><br/>"
      + "<b class=\"label preview\" style=\"display: none;\">Vorschau</b><br/><div id=\"math-preview\" class=\"math\">"
      + "</div><br/>"
      + "<b class=\"label\">Hinweis: Zwischen zwei \"$\"-Zeichen kannst Du hier auch direkt mit <a alt=\"Hilfeseite: "
      + "Alphabetical list of supported TeX Commands\" title=\"Hilfeseite: Alphabetical list of supported "
      + "TeX Commands\" href=\"http://www.onemathematicalcat.org/MathJaxDocumentation/TeXSyntax.htm\">$\\rm{TeX}$</a>"
      + " arbeiten.</b>" **/
      + "<br/><span class=\"label upload\">Alternativ kannst du auch ein Foto deiner "
      + "handschriftlichen, aber bitte leserlichen Berechnungen abgeben. Lade dazu Bitte eine Bild-Datei(JPG, PNG, GIF)"
      + "&nbsp;&nbsp<a class=\"button upload\" href=\"#\" alt=\"Bild hochladen\" title=\"Bild hochladen\">hier hoch</a>."
      + "</span><br/><br/><input type=\"submit\" value=\"Absenden\" class=\"button submit\"></input>"
      + "</form>"
    $("#content").append(submissionLabel).append(submission)
    $(".button.upload").click(aView.open_upload_dialog(uploadPath, aView.handleUploadResponse))

    /** debuggin <svg>-editing with a mathjax-dialog
    CKEDITOR.on('instancecreated', function (e) {
        console.log("instance created, registering double click handler... on ")
        e.editor.on( 'doubleclick', function( evt ) {
            console.log(evt)
            var element = evt.data.element.getAscendant( 'svg', true );
            console.log(element)
            if ( !element.isReadOnly() ) {
                if ( element.is( 'svg' ) ) {
                    // e.editor.getSelection().selectElement(element)
                    // console.log(element);
                    e.editor.execCommand('mathjaxDialog');
                }
            }
        })
    }); **/

    // setup cK-editor
    CKEDITOR.inline( document.getElementById( 'input' ) );
    // mathjax preview handling
    $input = $("[name=excercise-input]")
    $(".label.preview").show()
    $input.keyup(function(e) {
      aView.renderApproachMathPreview($input.val())
      return function(){}
    })

    aView.renderMathInContentArea()
  }

  this.renderApproachMathPreview = function(value) {
    $("#math-preview").text(value)
    MathJax.Hub.Queue(["Typeset", MathJax.Hub])
    // $("#math-preview").html("<img src=\"http://latex.codecogs.com/gif.latex?"+ value +"\" alt=\""+ value +"\">")
  }

  this.renderExcerciseObject = function (eObject) {

    $("#content").append("<br/><br/><b class=\"label\">Und hier ist die zu berechnende Aufgabe</b><br/><br/>")
    $("#content").append("<p class=\"excercise-object\">" + eObject.value + "</p><br/><br/>")
    /** $("#content").append("<span style=\"font-size: 10px; color: #a9a9a9; \">Hinweis: Falls du hier nur ein leeres Feld "
      + " siehst, lade bitte die Seite im Browser neu, oder versuch es bitte mit <a style=\"font-size: 11px; "
      + "color: #a9a9a9; cursor: pointer;\" href=\"javascript:aView.renderMathInContentArea()\">erneut zeichnen."
      + "</a></span><br/>")**/

    aView.renderMathInContentArea()
  }

  this.getExcerciseObjectView = function (eObject) {

    var string = "<br/><br/><b class=\"label\">Mit dem Aufgabenobjekt</b><br/>"
      + "<p class=\"excercise-object\">" + eObject.value + "</p><br/>"
    /** + "<span style=\"font-size: 10px; color: #a9a9a9; \">Hinweis: Falls du hier nur ein leeres Feld "
      + " siehst, lade bitte die Seite im Browser neu, oder versuch es bitte mit <a style=\"font-size: 11px; "
      + "color: #a9a9a9; cursor: pointer;\" href=\"javascript:aView.renderMathInContentArea()\">erneut zeichnen."
      + "</a></span><br/>" **/

    return string
  }

  this.renderOptionsAfterSubmission = function () {

    $("#content").html("<p class\"buffer\"><b class=\"label\">Dein L&ouml;sungsvorschlag f&uuml;r die "
      + "Aufgabenstellung \"" + aView.currentExcerciseText.value + "\" haben wir nun im System abgespeichert.</b></p>")
    .append("<p class\"buffer\"><b class=\"label\">Du kannst jetzt z.B.:</b><ul class=\"options\">"
      + "<li><a class=\"btn option\" href=\"" + host + "/eduzen/view/lecture/" + aView.currentLectureId
        + "/topicalarea/" + aView.currentTopicalarea.id + "\">"
        + "weitere Aufgabenstellungen aus dem Themenkomplex \"" + aView.currentTopicalarea.value
        + "\" ansehen,</a></li>"
        + "<li><a class=\"btn option\" href=\"" + host + "/eduzen/view/start\">"
        + "einen Blick in andere Themenkomplexe deiner Lehrveranstaltung werfen</a></li>"
        + "<li><a class=\"btn option\" href=\"" + aView.getExcerciseTextUrl() + "/history\">"
        + "oder deinen bisherigen &Uuml;bungsverlauf zu dieser Aufgabenstellung ansehen.</a></li>"
      + "</ul></p>")
  }

  this.renderOptionsForQuest = function () {

    // var overview = "<p class\"buffer\"><b class=\"label\">Folgende Infos k&ouml;nnen wir dir zus&auml;tzlich zu dieser "
      // + "Aufgabenstellung anbieten</b><br/><br/>"
    var overview = "<br/><br/>"

    if (aView.hasSampleSolution) {
      overview += "Du kannst dir eine <a class=\"btn option sample\" href=\""+ aView.getExcerciseTextUrl() + "/sample\">"
        + "Beispielaufgabe mit Musterl&ouml;sung ansehen</a><br/><br/>"
    } else  {
      overview += "Wir haben leider noch keine beispielhafte L&ouml;sung f&uuml;r diese Aufgabenstellung.<br/><br/>"
    }

    if (aView.hasExerciseHistory) {
      overview += "Du kannst dir deinen <a class=\"btn option history\" href=\""
        + aView.getExcerciseTextUrl() + "/history"+"\">"
        + "&Uuml;bungsverlauf zu dieser Aufgabenstellung ansehen</a><br/><br/>"
    } else {
      overview += "Du hast diese Aufgabenstellung bisher noch nicht bearbeitet.<br/><br/>"
    }

    // note: appendix of content to dom is done here in both cases, cause of current lazyness
    if (aView.webResources != undefined) {
      $("#content").append(overview) // doubled
      // content resource area header
      $("#content").append("<div class=\"topicalarea-resources\">"
        + "<b class=\"label\">Folgende Inhalte konnte dir die"
        + " EducationZEN-Redaktion bisher als Unterst&uuml;tzung f&uuml;r diese Aufgabenstellung zusammenstellen</b>"
        + "<ul class=\"web-resources\"></ul></div>")
      // content resource area body
      aView.renderWebResourcesForExerciseText()
    } else {
      overview += "Die Redaktion hat bisher keine unterst&uuml;tzenden Inhalte zu diese Aufgabenstellung assoziiert."
        + " Falls du hier evtl. helfen kannst, schicke uns Bitte eine <a href=\"mailto:team@eduzen.tu-berlin.de?"
        + "subject=Weitere Inhalte zur Aufgabenstellung "+ aView.currentExcerciseText.value +"&body=Evtl. habe ich hier"
        + " n&uuml;tzliche Hinweise zu unterst&uuml;tzenden Lehr-/Lerninhalten f&uuml;r die Redaktion und Seite "
        + aView.getExcerciseTextUrl() + "\" class=\"btn mail\">Mail</a> mit Hinweisen.<br/><br/>"
      $("#content").append(overview) // doubled
    }
  }

  this.renderWebResourcesForExerciseText = function() {
    if (aView.webResources != undefined) {
      var list = $(".topicalarea-resources .web-resources")
      console.log(aView.webResources)
      for (webpage in aView.webResources) {
        var link = dmc.get_topic_by_id(aView.webResources[webpage].id)
        var name = link.composite["dm4.webbrowser.web_resource_description"].value
        var url = link.composite["dm4.webbrowser.url"].value
        list.append("<li class=\"web-resource\"><a class=\"btn\" href=\""+ url +"\" target=\"_blank\">"
          + "<img border=\"0\" src=\"/de.deepamehta.webbrowser/images/earth.png\" title=\"Externer Link:"+ name +"\" "
          + "alt=\"Externer Link:"+ name +"\">Web Resource:"+ name +"</a></li>")
      }
    }
  }

  /** Rendering all submissions of our current user **/

  this.renderAllExcercisesList = function () {
    // unused
    $("#header").append("<b class=\"\">Eine Auflistung all deiner bisher eingereichten &Uuml;bungen</b>")
    var itemList = "<ul>"
    for (item in aView.allExcercises) {
      // display excercise-text for each taken excercise
      var excercise = dmc.get_topic_by_id(aView.allExcercises[item].id, true)
      itemList += "<li>" + excercise.value + "</li>"
    }
    itemList += "</ul>"
    $("#content").html(itemList)
  }

  /** Rendering all tries for any given excercise-text and our current user **/
  this.renderExcerciseHistoryForUser = function () {
    var e_text_state = aView.getExcerciseTextState(aView.currentExcerciseText.id).status
    // Content Header
    $("#content").html("<br/><b class=\"label history\">Historie</b> Du hast bisher "+ aView.allExcercises.length
      + " &Uuml;bung/en zu dieser Aufgabenstellung bearbeitet.&nbsp;&nbsp;&nbsp;"
      + "<b class=\"label\">Aufgabenstellung</b>&nbsp;<b class=\"history state\">"
      + dict.stateName(e_text_state) +"</b>")
    // Content Items
    for (item in aView.allExcercises) {
      var excercise = dmc.get_topic_by_id(aView.allExcercises[item].id)
      aView.currentExcercise = excercise
      var eObjectString = aView.getExcerciseObjectView(excercise.composite["tub.eduzen.excercise_object"])
      // use the first approach to represent a taken-excercise
      var approach = excercise.composite["tub.eduzen.approach"]
      var listItem = ""
      $("#content").append("<ul id=\"taken-excercises\">")
      if (approach != undefined) {
        approach = approach[0] // render just the first approach, here in this excercises overview
        var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
        var time = new Date(parseInt(timestamp))
        var dateString = time.toLocaleDateString() + ", um " + time.getHours() + ":" + time.getMinutes() + " Uhr"
        var state = aView.getExerciseState(excercise.id).excercise_state
        var nrOfApproaches = excercise.composite["tub.eduzen.approach"].length
        listItem = "<li class=\"taken-excercise\">"
            + "<span class=\"name\" id=\""+ excercise.id +"\"><a id=\"a-"+ excercise.id +"\" "
            + "href=\"javascript:void(0);\">"+ dateString +"</a></span><br/><span class=\"count\">"+ nrOfApproaches
            +"&nbsp;Versuch/e</span><span class=\"state\">Status der &Uuml;bung: "+ dict.stateName(state) +"</span>"
          + "</li>"
      } else {
        // excercise was taken-on, but an approach was not submitted yet
        listItem += "<li>Du hast die Aufgabe angenommen aber noch keinen L&ouml;sungsvorschlag dazu eingereicht."
          + "<br/><br/><span class=\"button new-approach\">Jetzt versuchen</span></li>"
        $(".button.takeon").remove()
        $("#sample-solution").remove()
      }

      $("#taken-excercises").append(eObjectString)
      $("#taken-excercises").append(listItem)
      $(".button.new-approach").click(create_existing_exercise_handler(excercise))

      $("#"+ excercise.id).click(create_exercise_handler(excercise))
      $("#a-"+ excercise.id).click(create_exercise_handler(excercise))
    }

    var sampleLink = ""
    if (aView.hasSampleSolution) {
      sampleLink = "<a class=\"btn new\" title=\"Beispielaufgabe ansehen\" "
        + "href=\""+ aView.getExcerciseTextUrl()+ "/sample\">Beispielaufgabe ansehen</a>"
    }
    var newLink = "<a class=\"btn new\" title=\"Neue &Uuml;bung annehmen\" "
      + "href=\""+ aView.getExcerciseTextUrl()+ "/new\">Neue &Uuml;bung annehmen</a>"

    $(".history.state").append("&nbsp;&nbsp;&nbsp;"+ newLink + sampleLink)

    function create_existing_exercise_handler (exercise) {
      return function(e) {
        aView.handleExistingExcercise(exercise)
        return function(){}
      }
    }

    function create_exercise_handler (excercise) {
      return function (e) {
        // aView.currentExcercise = excercise
        // aView.renderExcerciseApproachInfo()
        var excerciseLink = aView.currentExcerciseText.id
        window.location.href = aView.getExcerciseTextUrl() + "/excercise/"+ excercise.id // rel. without slash at start
        return function(e){}
      }
    }

  }

  /**
    * Rendering all tries for any given excercise-text and our current user
    * TODO: remove duplicated code from #approach_view.renderExcerciseInfo
    */
  this.renderExcerciseApproachInfo = function () {
    var excercise = aView.currentExcercise
    var excerciseText = excercise.composite["tub.eduzen.excercise_text"]
    var excerciseDescription = excerciseText.composite["tub.eduzen.excercise_description"]
    var excerciseObject = excercise.composite["tub.eduzen.excercise_object"]
    var e_text_state = aView.getExcerciseTextState(excerciseText.id).status
    // Page Header
    aView.renderHeader("excercise")
    // Page Body
    $("#content").html("<b class=\"label\">Aufgabenstellung</b><br/>" + excerciseDescription.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">Aufgabe</b><br/>" + excerciseObject.value +"<br/><br/>")
    if (e_text_state != "tub.eduzen.solved") {
      $("#content").append("<span class=\"button new-approach\">Neuer Versuch</span><br/><br/><br/>")
    }
    $("#content").append("<b class=\"label\">Eingereichte L&ouml;sungsversuche</b>"
      + "<div id=\"approach-info\"><ul class=\"approach-list\"></ul></div>")
    var approaches = excercise.composite["tub.eduzen.approach"]
    // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
    var numberOfApproach = 1;
    for (item in approaches ) {
      var approach = approaches[item]
      var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
      var time = new Date(parseInt(timestamp))
      var dateString = time.toLocaleDateString() + ", um " + time.getHours() + ":" + time.getMinutes() + " Uhr"
      // var state = approach.composite["tub.eduzen.approach_correctness"].value
      var state = aView.getApproachState(approach.id).status
      var content = approach.composite["tub.eduzen.approach_content"].value
      var comments = aView.getCommentsForApproach(approach.id)
      // Page Item
      // var commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Neues Kommentar verfassen\""
        // + "title=\"Neues Kommentar verfassen\">Neues Kommentar verfassen</a>"
      var commentsLink = "<br/>Wartend auf Feedback."
      if (comments.total_count > 0) {
        commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Alle Kommentare anzeigen\""
        + "title=\"Alle Kommentare anzeigen\">Feedback anzeigen</a>"
      }
      var listItem = "<li class=\"approach\"><div class=\"approach-"+ numberOfApproach +"\">"
          + "<span class=\"submitted\">"+ numberOfApproach +". Versuch, eingereicht um "+ dateString +"</span>"
          + "<b class=\"label\">&nbsp;ist <span class=\"darkstate\">\""+ dict.stateName(state) +"\"</span><br/>"
          + "<div class=\"content\">"+ content +"</div>"
          + "<span class=\"comments\">"+ commentsLink +"</span></div>"
        + "</li>"
      $(".approach-list").append(listItem)
      $(".btn."+ approach.id +".comment").click(create_comment_handler(approach, numberOfApproach))
      var attachment = aView.getFileContent(approach.id)
      if (attachment != undefined) {
        aView.renderFileAttachment(approach.id, attachment[0], numberOfApproach)
      }
      numberOfApproach++
    }

    $(".button.new-approach").click(create_existing_exercise_handler(excercise))

    function create_existing_exercise_handler (exercise) {
      return function(e) {
        aView.handleExistingExcercise(exercise)
        return function(){}
      }
    }

    function create_comment_handler (approach, numberOfApproach) {
      return function(e) {
        aView.renderCommentsForApproach(approach, numberOfApproach)
        // aView.renderCommentFormForApproach(approach, numberOfApproach)
        // ### return function(){}
      }
    }
  }

  this.renderCommentsForApproach = function(approach, numberOfApproach) {
    $(".approach-"+ numberOfApproach).append("<ul id=\"comment-list\">")
    $("#comment-list").empty()
    var comments = aView.getCommentsForApproach(approach.id)
    if (comments.total_count > 0) {
      aView.existingComments = comments
      for (c in comments.items) {
        var comment = dmc.get_topic_by_id(comments.items[c].id, true)
        var author = aView.getAuthorOfComment(comment.id).items[0]
        var explanation = comment.composite["tub.eduzen.comment_explanation"].value
        author = (author == undefined) ? author = "anonymus" : author.value
        var commentView = "<li class=\"comment\">"+ author +" sagt der Vorschlag ist "
          + dict.stateName(comment.value) +"<br/>"
          + explanation +"</li>"
        $("#comment-list").append(commentView)
      }
    }
    aView.renderMathInContentArea()
  }

  this.renderCommentFormForApproach = function(approach, numberOfApproach) {
    $("#new-comment").remove()
    var form = "<div id=\"new-comment\"><b class=\"label\">Inhalt deines Kommentars</b>"
      + "<form name=\"comment\" id=\"new-comment-form\" action=\"javascript:void(0);\">"
      + "<input class=\"inputfield\" type=\"text\" size=\"80\" rows=\"4\"></input><br/>"
      + "<label for=\"is-correct\">Den L&ouml;sungsvorschlag find ich korrekt"
      + "<input class=\"is-correct\" name=\"is-correct\" type=\"checkbox\"></input></label>"
      + "<input class=\"btn comment\" type=\"submit\" value=\"Kommentieren\"></input>"
      + "</form></div>"
    $(".approach-"+ numberOfApproach).append(form)
    $("#new-comment-form").submit(do_comment_handler(approach))

    function do_comment_handler(approach) {
      return function() {
        var correctness = $("#new-comment-form .is-correct").is(":checked")
        var value = $("#new-comment-form .inputfield").val()
        aView.doCommentApproach(approach, value, correctness)
      }
    }
  }

  this.renderFileAttachment = function(approachId, attachment, numberOfApproach) {
    // var icon = host + "/de.deepamehta.files/images/sheet.png"
    var img = host + "/filerepo/uebungen-uploads-wise12/" + attachment.value
    // var iconSrc = "<img src=\""+ icon +"\" alt=\"Document: "+ attachment.value +"\" title=\"Document: "
      // + attachment.value +"\" class=\"file-icon\">"
    var fileSrc = "<img src=\""+ img +"\" alt=\"Document: "+ attachment.value +"\" title=\"Document: "
      + attachment.value +"\" class=\"file-icon\">"
    // $(".approach-"+ numberOfApproach).append(iconSrc)
    $(".approach-"+ numberOfApproach + " .content").append(fileSrc)
  }

  /**
   * Controler to take on an excercise with an approach
   * Input:  TUB-Identity, Excercise Text, Excercise Object, Approach Value, File, Timestamp
   * Output: TUB-Identity <author> Excercise (<composedof> Excercise Text AND <composedof> Excercise Object)
   *         <aggregate> Approach Composite :which_can_haz: <content_item> File
   **/

  this.submitApproachToExcercise = function () {
    // render "Submitting .. "
    $(".button.submit").append("<b class=\"label\">Submitting ...</b>")
    // 1) submission: create + relate approach to that excercise
    // var submittedValue = $("[name=excercise-input]").val()
    var submittedValue = aView.getTeXAndHTMLSource(document.getElementById("input"))
    var approach = aView.createApproachForExcercise(submittedValue) // along with excercise-object, if necessary
    if (!approach) throw new Error("Approach could not be submitted. Something went wrong.")
    // 2) submission: attach a possibly submitted file-upload to this appraoch
    if (aView.currentFileApproach != undefined) {
      // and relate the just uploaded file-topic to our approach
      var approachFilemodel = {"type_uri":"tub.eduzen.content_item",
        "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
        "role_2":{"topic_id":aView.currentFileApproach.topic_id, "role_type_uri":"dm4.core.part"}
      }
      dmc.create_association(approachFilemodel)
      console.log("deBG: related newly uploaded file to approach via \"tub.eduzen.content_item\"")
    }
    // approach to excercise was submitted, render options
    aView.renderOptionsAfterSubmission()
    // push state, coming from subView "/new"
    aView.pushHistory({"command": "submitted"}, "EducationZEN - Übung für "+ aView.currentExcerciseText.value
      + "eingereicht", aView.getExcerciseTextUrl() + "/submitted")
    // ## render time take for excercise
  }

  this.createExcerciseForUser = function () {
    // 1) create Excercise, relate it to excerciseTextId and relate it to userId
    var eText = aView.currentExcerciseText
    if (user.identity == undefined) throw new Error("Your User-Account has no TUB-Identity. Cannot take excercises.")
    if (eText == undefined) throw new Error("Something mad happened. Please try again.")
    // FIXME: set current time user has taken this excercise on server or never
    var exerciseModel = {"type_uri": "tub.eduzen.excercise", "composite": {
        "tub.eduzen.timeframe_note": new Date().getTime().toString()
    }}
    var excercise = dmc.create_topic(exerciseModel)
    // ### to clarify: anonymous excercise topics or something like..
    // "#" + eText.id + " on " + new Date().getDate() + "/" + new Date().getMonth() + "/" + new Date().getYear()})

    // update client side model, there is a new object
    aView.currentExcercise = excercise
    var excerciseTextModel = {"type_uri":"dm4.core.aggregation",
      "role_1":{"topic_id":excercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":eText.id, "role_type_uri":"dm4.core.part"}
    }
    // 2) persist current excercise-object of our freshly assembled excercise
    var eObjectModel = {"type_uri":"dm4.core.aggregation",
      "role_1":{"topic_id":aView.currentExcercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":aView.currentExcerciseObject.id, "role_type_uri":"dm4.core.part"}
    }
    dmc.create_association(eObjectModel)
    console.log("dEBUG: saved excercise-objects => "
      + aView.currentExcerciseObject.id + " to current excercise => " + aView.currentExcercise.id)
    // 3) relate author to it as submitter
    var authorModel = {"type_uri":"tub.eduzen.submitter",
      "role_1":{"topic_id":user.identity.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(excerciseTextModel)
    dmc.create_association(authorModel)
    console.log("dEBUG: saved \""+ user.identity.value +"\" as \"submitter\" to newly created excercise " + excercise.id)
  }

  this.createApproachForExcercise = function (value) {
    var approachModel = {"type_uri": "tub.eduzen.approach", "composite": {
        "tub.eduzen.approach_content": value,
        "tub.eduzen.timeframe_note": new Date().getTime().toString(),
        "tub.eduzen.approach_correctness": "ref_uri:tub.eduzen.approach_undecided",
        "tub.eduzen.approach_sample": false
    }}
    var approach = dmc.create_topic(approachModel)
    if (approach == undefined || aView.currentExcercise == undefined) throw new Error("Something mad happened.")
    var approachExcercisemodel = {"type_uri":"dm4.core.composition",
      "role_1":{"topic_id":aView.currentExcercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":approach.id, "role_type_uri":"dm4.core.part"}
    }
    dmc.create_association(approachExcercisemodel)
    console.log("dEBUG: saved new approach => " + approach.id + " to current excercise => " + aView.currentExcercise.id)
    return approach
  }



  /** Approach View Helpers  **/

  this.handleNewExcercise = function () {
    // get an excercise-object if available and display it along with an approach form
    // TODO: REST-Service Methode to deliver a proper excercise-object for this exercise-text and this user,
    // TODO: and to create a new Excercise to persist whihc excercise the user has already seen for this e-text
    // render excercise-text header
    $("#content").empty()
    aView.renderExcerciseTextDescription()
    // find an exercise-object for user and this exercise-text
    var eObject = aView.getExcerciseObjects(aView.currentExcerciseText.id)
    if (eObject.total_count == 0) {
      // FIXME: either there is really no object related to the excercise-text (already self-contained)
      // or there is none fresh left for this user. workaround: hand out some already known excercise-object anyways
      var compatibles = aView.getCompatibleExerciseObjects(aView.currentExcerciseText.id)
      aView.currentExcerciseObject = compatibles[0]
    } else if (eObject.total_count >= 1) {
      var object = eObject.items[0]
      // update client side model
      aView.currentExcerciseObject = object
    }
    // 1) take on: create excercise and relate it to current user
    aView.createExcerciseForUser()
    aView.renderExcerciseObject(aView.currentExcerciseObject)
    // FIXME: clean up rendering of this view
    aView.renderApproachForm()
    aView.renderMathInContentArea()
    aView.pushHistory({"command":"new"}, "EducationZEN Übungsverlauf für "+ aView.currentExcerciseText.value,
      aView.getExcerciseTextUrl() + "/new")
  }

  this.handleExistingExcercise = function (exercise) {
      // render excercise-text header
      $("#content").empty()
      aView.renderExcerciseTextDescription()
      aView.currentExcerciseObject = exercise.composite["tub.eduzen.excercise_object"]
      aView.renderExcerciseObject(aView.currentExcerciseObject)
      aView.renderApproachForm()
      aView.renderMathInContentArea()
      aView.pushHistory({"command":"excercise"}, "EducationZEN Übung für "+ aView.currentExcerciseText.value,
        aView.getExcerciseTextUrl() + "/new-approach") // ### implement new-approach permalink
  }

  this.handleUploadResponse = function (response) {
    aView.currentFileApproach = response
    if (aView.currentFileApproach.file_name.indexOf("deepamehta-files") == 0) {
      return undefined // no file given
    } else {
      var fileResponseHTML = "<br/><br/>Die Datei \""
        + aView.currentFileApproach.file_name + "\" wurde zur Abgabe hochgeladen."
      $(".label.upload").append(fileResponseHTML)
      // ### allow users to delete their just accidentially uploaded file..
    }
  }

  this.getExcerciseTextUrl = function() {
      return host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/"
          + aView.currentTopicalarea.id +"/etext/"+ aView.currentExcerciseText.id
  }

  this.getTopicalareaUrl = function() {
      return host + "/eduzen/view/lecture/"
          + aView.currentLectureId + "/topicalarea/"+ aView.currentTopicalarea.id
  }

  /** Server Communications - Strictly persisting server and updating client side model **/
  /** Methods to access eduzen, deepamehta-core and accesscontrol REST-Services **/

  this.loadExcercisesForExcerciseText = function(eTextId) {
    // returns false if user is not logged in
    var usersExcercisesForExcerciseText = new Array()
    // FIXME: assemble this on the server-side, get all excercises on this excercise-text by this author
    if (user.identity == undefined) {
      console.log("Please login first.")
      return false
    } else {
      var excercisesByUser = aView.getAllExcercisesByUser()
      if (excercisesByUser != undefined) {
        for (element in excercisesByUser) {
          var excercise = excercisesByUser[element]
          var eTexts = dmc.get_topic_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.excercise_text",
            "assoc_type_uri": "dm4.core.aggregation"}) // eText plays "Part"-Role here
          if (eTexts.total_count > 0) { // one excercise has always just one excercise_text assigned
            // just add those excercises, dealing with this excercise-text
            if (eTextId == eTexts.items[0].id) {
              usersExcercisesForExcerciseText.push(excercise)
              aView.hasExerciseHistory = true
            }
          }
        }
        //
        aView.allExcercises = usersExcercisesForExcerciseText
      }
    }
  }

  this.loadWebResourcesForExerciseText = function (eTextId) {
    var web_resources = dmc.get_topic_related_topics(eTextId,
      {"others_topic_type_uri": "dm4.webbrowser.web_resource", "assoc_type_uri": "tub.eduzen.content_item"})
    return (web_resources.total_count > 0) ? web_resources.items : undefined
  }

  /** Server Communications - Strictly returning raw data **/

  this.doCommentApproach = function(approach, value, isCorrect) {
    // ### FIXME: recheck for still-existing user
    console.log(" do comment this approiach wiht " + value)
    // ### FIXME: strip input to API.. ;)
    var newComment = {"type_uri": "tub.eduzen.comment", "composite": {
        "tub.eduzen.comment_correct": isCorrect,
        "tub.eduzen.comment_explanation": value
    }}
    var savedComment = dmc.create_topic(newComment)
    if (savedComment == undefined) throw new Error("Something mad happened.")
    var commentApproachModel = {"type_uri":"dm4.core.composition",
      "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.part"}
    }
    var authorModel = {"type_uri":"tub.eduzen.author",
      "role_1":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":user.user.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(commentApproachModel)
    dmc.create_association(authorModel)
    console.log("    saved comment => " + isCorrect + "  approach: " + approach.id + " for author: " + user.user.value)
    // refresh content area
    aView.renderExcerciseApproachInfo()
  }

  this.isSampleApproachAvailable = function (eTextId) {
    // fixme: needs a server side method to better select sample-solutions for an excercise-text
    var excercises = dmc.get_topic_related_topics(eTextId, {"others_topic_type_uri": "tub.eduzen.excercise"})
    if (excercises.total_count > 0) { // FIXME: optimize on server-side
      for (taken in excercises.items) { // get all approaches submitted to this excercise
        var excercise = dmc.get_topic_by_id(excercises.items[taken].id, true)
        var approaches = dmc.get_topic_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.approach"})
        if (approaches.total_count > 0) { // find sample solutions..
          for (a in approaches.items) { // get all approaches marked as sample solution
            var approach = approaches.items[a]
            approach = dmc.get_topic_by_id(approach.id, true)
            // sanity check, some approaches have no value set here..
            if (approach.composite["tub.eduzen.approach_sample"]) {
              if (approach.composite["tub.eduzen.approach_sample"].value) { // evaluates to true, thanks to the editors
                aView.sampleExercise = excercise
                return true
              }
            }
          }
        }
      }
    }
    return false
  }

  this.getExcerciseTextState = function(id) {
    return dmc.request("GET", "/eduzen/state/exercise-text/" + id, undefined, undefined, undefined, false)
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getAuthorOfComment = function (commentId) {
    // FIXME: Ientity
    return dmc.get_topic_related_topics(commentId,
      {"others_topic_type_uri": "tub.eduzen.identity", "assoc_type_uri": "tub.eduzen.author"})
  }

  this.getExerciseState = function(exerciseId) {
    return dmc.request("GET", "/eduzen/state/exercise/"+ exerciseId, undefined, undefined, undefined, false)
  }

  this.getApproachState = function(approachId) {
    return dmc.request("GET", "/eduzen/state/approach/"+ approachId, undefined, undefined, undefined, false)
  }

  this.getAllExcercisesByUser = function () {
    if (user.identity == undefined) throw new Error("Your User Account has now TUB Identity, so no submitted approaches.")
    var excercises = dmc.get_topic_related_topics(user.identity.id, {"others_topic_type_uri": "tub.eduzen.excercise",
      "assoc_type_uri": "tub.eduzen.submitter"})
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

  this.getCompatibleExerciseObjects = function (excerciseTextId) {
    var objects = dmc.get_topic_related_topics(excerciseTextId, {"others_topic_type_uri": "tub.eduzen.excercise_object",
      "assoc_type_uri": "tub.eduzen.compatible"})
    return (objects.total_count > 0) ? objects.items : undefined
  }

  this.getExcerciseObjects = function (excerciseTextId) {
    return dmc.request("GET", "/eduzen/exercise-object/"+ excerciseTextId, undefined, undefined, undefined, false)
  }

  /** HTML5 History API utility methods **/

  this.registerPopState = function () {
    // Revert to a previously saved state
    // window.addEventListener('popstate', aView.popHistory)
  }

  this.popHistory = function (state) {
    if (!aView.historyApiSupported) return
    // do handle pop events
    console.log("popping state.. ")
  }

  this.pushHistory = function (state, name, link) {
    if (!aView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    console.log("pushing state.. to " + link)
    window.history.pushState(history_entry.state, name, history_entry.url)
  }



  /** GUIToolkit Helper Methods copied from dm4-webclient module **/

  /**
   * @param   path        the file repository path (a string) to upload the selected file to. Must begin with "/".
   * @param   callback    the function that is invoked once the file has been uploaded and processed at server-side.
   *                      One argument is passed to that function: the object (deserialzed JSON)
   *                      returned by the (server-side) executeCommandHook. ### FIXDOC
   */
  this.open_upload_dialog = function(new_path, callback) {

    // 1) install upload target
    var upload_target = $("<iframe>", {name: "upload-target"}).hide()
    $("body").append(upload_target)

    // 2) create upload dialog
    var upload_form = $("<form>", {
      method:  "post",
      enctype: "multipart/form-data",
      target:  "upload-target"
    })
    .append($('<input type="file">').attr({name: "file", size: 60}))
    .append($('<input class=\"button\" type="submit">').attr({value: "Upload"}))
    //
    var upload_dialog = aView.ui.dialog({title: "Upload File", content: upload_form})

    // 3) create dialog handler
    return function() {
      upload_form.attr("action", "/files/uebungen-uploads-wise12/" + new_path)
      upload_dialog.open()
      // bind handler
      upload_target.unbind("load")    // Note: the previous handler must be removed
      upload_target.load(upload_complete)

      function upload_complete() {
        upload_dialog.close()
        // Note: iframes must be accessed via window.frames
        var response = $("pre", window.frames["upload-target"].document).text()
        try {
          callback(JSON.parse(response))
        } catch (e) {
          alert("Upload failed: \"" + response + "\"\n\nException=" + JSON.stringify(e))
        }
      }
    }
  }

  this.setupMathJaxRenderer = function() {
    MathJax.Ajax.config.root = host + "/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
    MathJax.Hub.Config({
        "extensions": ["tex2jax.js", "mml2jax.js", "MathEvents.js", "MathZoom.js", "MathMenu.js", "toMathML.js",
           "TeX/noErrors.js","TeX/noUndefined.js","TeX/AMSmath.js","TeX/AMSsymbols.js", "FontWarnings.js"],
        "jax": ["input/TeX", "output/SVG"], // "input/MathML", "output/HTML-CSS", "output/NativeMML"
        "tex2jax": {"inlineMath": [["$","$"],["\\(","\\)"]]},
        "menuSettings": {
            "mpContext": true, "mpMouse": true, "zscale": "200%", "texHints": true
        },
        "errorSettings": {
            "message": ["[Math Error]"]
        },
        "displayAlign": "left",
        "HTML-CSS": { "scale": 120 },
        "SVG": {"blacker": 8, "scale": 110},
        "v1.0-compatible": false,
        "skipStartupTypeset": false,
        "elements": ["content", "header"]
    });
    MathJax.Hub.Configured() // bootstrap mathjax.js lib now
  }

  this.getTeXAndHTMLSource = function (body) {
        var objects = $('.math-output', body)
        for (i=0; i < objects.length; i++) {
            var div = objects[i]
            var containerId = div.id
            var mathjaxId = $('script', div).attr('id')
            // console.log("containerId: " + containerId + " mathjaxId: " + mathjaxId)
            // var math = getInputSourceById(MathJax.Hub.getAllJax("MathDiv"), mathjaxId)
            var math = $("#" + mathjaxId, body).text()
            if ( math ) {
                // put latexSource into div-preview container before saving this data
                $('#'+ containerId, body).html('<span class=\"math-preview\">$$ '+ math + ' $$</span>')
            } else {
                console.log("Not found.. ")
                // ### prevent dialog from opening up
            }
        }
        // var data = $("" + body.innerHTML + "") // copy raw-data of ck-editor
        // console.log(data)
        // MathJax.Hub.Typeset() // typeset ck-editor again
        return body.innerHTML

        // duplicate helperfunction in mathjax/dialogs/mathjax.js
        function getInputSourceById(id, body) {
            return $("#" + id, body).value
            /** for (obj in elements) {
                var element = elements[obj]
                console.log("element.inputID: " + element.inputID + " == " + id)
                if (element.inputID === id) return element
            }**/
            // return undefined
        }

  }

}

$(window).load(aView.initViews)

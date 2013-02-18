## EducationZen Application Views

Our current stable version is live at <http://stable.eduzen.tu-berlin.de/eduzen/view/start>. You can register an account through checking our [website](http://www.eduzen.tu-berlin.de).

## Installation & Usage

This is a prototypical user interface customly made for [eduZEN-Application](the http://github.com/mukil/dm4.eduzen) and realized as a [DeepaMehta 4](http://github.com/jri/deepamehta). This interface is aimed to be supported by all latest versions of the web browsres Firefox, Chromium, Safari and Opera.

After you have deepamehta and all bundles of the eduZEN-Application installed you can browse this interface at e.g. <http://localhost:8080/eduzen/view/start> and login.

## Getting started

To get started you have to setup some data: Create a new "User account" and associate it with a new "Identity"-Topic for testing purposes. Then set the newly created "Identity" as a "Participant" of your first "Lecture". A "Lecture" must be created and related to a "Course". Then you can start to add "Lecture content" to the relation between a "Topical area" and e.g. "Lecture 1". Sounds complicated and yes, it is.

Somewhat special is that "Exercises" for editors, are seperated into "Exercise Text" and an "Exercise Object" allowing us to generate many variations of on "Exercise" for each of our students.

Furthermore "Resources" (Web Resources or Documents) can be associated to (and thus rendered related to) "Topical areas" and "Exercise Texts".

## Changelog

### 1.0-SNAPSHOT, Feb 18, 2013

- mathjax-ckeditor integration for simplified user input
- tested with new deepamehta-4.0.14-backend and upgraded dm4.eduzen-1.0-SNAPSHOT

### 1.0-SNAPSHOT, End of January, 2013

- Minor fixes in the UI
- adapted to run with deepamehta-4.0.13-SNAPSHOT and it's 'neo4j-1.2' branch

### 1st Milestone, End of October, 2013

- User Account View
- Course / Topical Area View
- Topical Area / Excercise View
- Excercise View 
- Approach / Commentor View

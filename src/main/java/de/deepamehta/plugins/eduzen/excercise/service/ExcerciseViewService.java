package de.deepamehta.plugins.eduzen.excercise.service;

import java.util.Set;
import java.io.InputStream;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.service.PluginService;

public interface ExcerciseViewService extends PluginService {

    InputStream getStartView(ClientState clientState); // String viewId, String typeId, String topicId

    InputStream getUserView(long userId, ClientState clientState);

    InputStream getLectureView(long lectureId, ClientState clientState);

    InputStream getLectureTopicalareaView(long lectureId, long topicalareaId, ClientState clientState);

    InputStream getTopicalareaView(long topicalareaId, ClientState clientState);

    InputStream getTopicalareaExcerciseTextView(long lectureId, 
      long topicalareaId, long excerciseTextId, ClientState clientState);

    InputStream getTopicalareaExcerciseView(long lectureId, 
      long topicalareaId, long excerciseTextId, long excerciseId, ClientState clientState);

    InputStream getLecturesView(ClientState clientState);

    InputStream getSubmittedApproachesView(ClientState clientState);

    InputStream getCommentingView(ClientState clientState);

    InputStream getCommentingView(long excerciseId, ClientState clientState);

}

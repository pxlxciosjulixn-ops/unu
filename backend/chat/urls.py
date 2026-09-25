from django.urls import path

from chat import views

app_name = "chat"

urlpatterns = [
    path("", views.send, name="send"),
    path("analyses/", views.analyses, name="analyses"),
    path("analyses/<int:analysis_id>/", views.analysis_detail, name="analysis-detail"),
    path(
        "analyses/<int:analysis_id>/restore/",
        views.analysis_restore,
        name="analysis-restore",
    ),
    path(
        "analyses/<int:analysis_id>/purge/",
        views.analysis_purge,
        name="analysis-purge",
    ),
    path(
        "analyses/<int:analysis_id>/stats/",
        views.analysis_stats,
        name="analysis-stats",
    ),
    path("trash/", views.trash, name="trash"),
    path("settings/", views.chat_settings, name="settings"),
    path(
        "settings/profanity/",
        views.chat_settings_profanity,
        name="settings-profanity",
    ),
    path(
        "settings/personality/",
        views.chat_settings_personality,
        name="settings-personality",
    ),
    path("settings/unlock/", views.chat_settings_unlock, name="settings-unlock"),
    path(
        "settings/unlimited/",
        views.chat_settings_unlimited,
        name="settings-unlimited",
    ),
    path("settings/feedback/", views.feedback_stats, name="feedback-stats"),
    path(
        "settings/messages/",
        views.chat_settings_messages,
        name="settings-messages",
    ),
    path(
        "messages/<int:message_id>/feedback/",
        views.message_feedback,
        name="message-feedback",
    ),
    path("settings/length/", views.chat_settings_length, name="settings-length"),
    path("conversations/", views.conversations, name="conversations"),
    path("conversations/clear/", views.conversations_clear, name="conversations-clear"),
    path(
        "conversations/<uuid:conversation_id>/",
        views.conversation_detail,
        name="conversation-detail",
    ),
    path(
        "conversations/<uuid:conversation_id>/restore/",
        views.conversation_restore,
        name="conversation-restore",
    ),
    path(
        "conversations/<uuid:conversation_id>/purge/",
        views.conversation_purge,
        name="conversation-purge",
    ),
]

package com.umlforge.backend.service.ia.chat;

public interface ChatIAProvider {
    String getName();
    int getPriority();
    boolean isAvailable();
    String getUnavailableReason();
    ChatIAProviderResult generate(String prompt);
}

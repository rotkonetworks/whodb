import { useChat } from "@/contexts/ChatContext"
import { ChatWidget } from "./ChatWidget"

export function ChatWidgetContainer() {
  const { openChats, closeChat, minimizeChat, maximizeChat } = useChat()

  if (openChats.length === 0) {
    return null
  }

  const minimizedChats = openChats.filter(c => c.isMinimized)
  const expandedChats = openChats.filter(c => !c.isMinimized)

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
      {minimizedChats.length > 0 && (
        <div className="flex gap-2">
          {minimizedChats.map((chat) => (
            <ChatWidget
              key={chat.id}
              recipientAddress={chat.recipientAddress}
              recipientName={chat.recipientName}
              recipientPgpFingerprint={chat.recipientPgpFingerprint}
              recipientIsVerified={chat.recipientIsVerified}
              network={chat.network}
              isMinimized={true}
              onMinimize={() => minimizeChat(chat.id)}
              onMaximize={() => maximizeChat(chat.id)}
              onClose={() => closeChat(chat.id)}
            />
          ))}
        </div>
      )}

      {expandedChats.map((chat) => (
        <ChatWidget
          key={chat.id}
          recipientAddress={chat.recipientAddress}
          recipientName={chat.recipientName}
          recipientPgpFingerprint={chat.recipientPgpFingerprint}
          recipientIsVerified={chat.recipientIsVerified}
          network={chat.network}
          isMinimized={false}
          onMinimize={() => minimizeChat(chat.id)}
          onMaximize={() => maximizeChat(chat.id)}
          onClose={() => closeChat(chat.id)}
        />
      ))}
    </div>
  )
}

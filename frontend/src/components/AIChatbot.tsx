import React, { useState } from 'react';
import { sendChatMessage } from '../api';
import { 
  Bot, Send, Sparkles, ArrowRight 
} from 'lucide-react';

interface AIChatbotProps {
  onJobUpdated: () => void;
  onViewJob: (jobId: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  jobs_list?: any[];
  updated_job_id?: string;
}

const QUICK_COMMANDS = [
  "J001 applied",
  "J001 assessment received",
  "J001 interview scheduled",
  "J001 offer received",
  "Show my applied jobs",
  "How many jobs in Bangalore?",
  "Show my high priority jobs"
];

export const AIChatbot: React.FC<AIChatbotProps> = ({ onJobUpdated, onViewJob }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your AI Job Tracker Assistant. You can command me to update status in `AI_Job_Tracker.xlsx` or query your applications!\n\nTry commands like:\n- `J001 applied`\n- `J001 interview scheduled`\n- `How many jobs in Bangalore?`\n- `Show my high priority jobs`'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(text.trim());
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply,
        jobs_list: res.jobs_list,
        updated_job_id: res.updated_job_id
      };
      setMessages(prev => [...prev, aiMsg]);
      
      if (res.action_taken === 'update_status') {
        onJobUpdated();
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Sorry, I encountered an error processing your command.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI Job Assistant</h1>
            <p className="text-xs text-slate-500">Natural language status updates & query engine</p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Excel Sync Active</span>
        </span>
      </div>

      {/* Quick Command Chips */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleSend(cmd)}
            className="shrink-0 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
        
        {/* Messages List */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none shadow-md shadow-sky-600/20'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                }`}
              >
                <div className="whitespace-pre-line font-medium">{m.text}</div>

                {/* Render Job List returned by queries */}
                {m.jobs_list && m.jobs_list.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                    {m.jobs_list.map((j) => (
                      <div
                        key={j.job_id}
                        onClick={() => onViewJob(j.job_id)}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-slate-800 cursor-pointer hover:border-sky-400 transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-bold text-sky-600 mr-2">{j.job_id}</span>
                          <span className="font-semibold">{j.company}</span> — <span className="text-slate-600">{j.job_role}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {j.location}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.updated_job_id && (
                <button
                  onClick={() => onViewJob(m.updated_job_id!)}
                  className="mt-1 text-[11px] font-bold text-sky-600 hover:underline inline-flex items-center space-x-1"
                >
                  <span>View {m.updated_job_id} in Job Tracker</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <Sparkles className="w-4 h-4 animate-spin text-sky-500" />
              <span>AI is updating Excel...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. J052 applied, J052 interview scheduled, or How many jobs in Bangalore?"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none shadow-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl shadow-md shadow-sky-600/20 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

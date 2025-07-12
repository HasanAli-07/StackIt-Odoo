import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import RichTextEditor from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import api from '../services/api';
import { Question, Answer } from '../types';

const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshNotifications, refreshUnreadCount } = useNotifications();
  const queryClient = useQueryClient();
  
  const [newAnswer, setNewAnswer] = useState('');
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  // Fetch question details
  const { data: question, isLoading, error } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.get(`/questions/${id}`).then(res => res.data.data),
    enabled: !!id
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ targetType, targetId, voteType }: { targetType: 'question' | 'answer', targetId: number, voteType: -1 | 1 }) => {
      if (targetType === 'question') {
        return api.post(`/questions/${targetId}/vote`, { vote_type: voteType });
      } else {
        return api.post(`/questions/${id}/answers/${targetId}/vote`, { vote_type: voteType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', id] });
      // Refresh notifications after voting
      refreshNotifications();
      refreshUnreadCount();
    }
  });

  // Accept answer mutation
  const acceptAnswerMutation = useMutation({
    mutationFn: (answerId: number) => api.post(`/questions/${id}/answers/${answerId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', id] });
      // Refresh notifications after accepting answer
      refreshNotifications();
      refreshUnreadCount();
    }
  });

  // Unaccept answer mutation
  const unacceptAnswerMutation = useMutation({
    mutationFn: (answerId: number) => api.post(`/questions/${id}/answers/${answerId}/unaccept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', id] });
      // Refresh notifications after unaccepting answer
      refreshNotifications();
      refreshUnreadCount();
    }
  });

  // Post answer mutation
  const postAnswerMutation = useMutation({
    mutationFn: (content: string) => api.post(`/questions/${id}/answers`, { content }),
    onSuccess: () => {
      setNewAnswer('');
      setShowAnswerForm(false);
      queryClient.invalidateQueries({ queryKey: ['question', id] });
      // Refresh notifications after posting answer
      refreshNotifications();
      refreshUnreadCount();
    }
  });

  const handleVote = (targetType: 'question' | 'answer', targetId: number, voteType: -1 | 1) => {
    if (!user) {
      navigate('/login');
      return;
    }
    voteMutation.mutate({ targetType, targetId, voteType });
  };

  const handleAcceptAnswer = (answerId: number) => {
    if (!user || (question?.user_id !== user.id && user.role !== 'admin')) return;
    acceptAnswerMutation.mutate(answerId);
  };

  const handleUnacceptAnswer = (answerId: number) => {
    if (!user || (question?.user_id !== user.id && user.role !== 'admin')) return;
    unacceptAnswerMutation.mutate(answerId);
  };

  const handlePostAnswer = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newAnswer.trim()) return;
    postAnswerMutation.mutate(newAnswer);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Question not found</h1>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => handleVote('question', question.id, 1)}
              className={`p-2 rounded hover:bg-gray-100 ${
                question.user_vote === 1 ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="font-semibold text-lg">{question.votes}</span>
            <button
              onClick={() => handleVote('question', question.id, -1)}
              className={`p-2 rounded hover:bg-gray-100 ${
                question.user_vote === -1 ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Question content */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>
            
            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className="flex gap-2 mb-4">
                {question.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Question description */}
            <div 
              className="prose max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: question.description }}
            />

            {/* Question meta */}
            <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
              <div className="flex items-center gap-4">
                <span>Asked {new Date(question.created_at).toLocaleDateString()}</span>
                <span>{question.views} views</span>
                <span>{question.answer_count || 0} answers</span>
              </div>
              {question.user && (
                <div className="flex items-center gap-2">
                  <span>by</span>
                  <span className="font-medium text-gray-900">{question.user.username}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {question.answers?.length || 0} Answer{question.answers?.length !== 1 ? 's' : ''}
        </h2>

        {question.answers && question.answers.length > 0 ? (
          <div className="space-y-6">
            {question.answers.map((answer: Answer) => (
              <div
                key={answer.id}
                className={`bg-white rounded-lg shadow-sm border p-6 ${
                  answer.is_accepted ? 'border-green-500 bg-green-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => handleVote('answer', answer.id, 1)}
                      className={`p-2 rounded hover:bg-gray-100 ${
                        answer.user_vote === 1 ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="font-semibold text-lg">{answer.votes}</span>
                    <button
                      onClick={() => handleVote('answer', answer.id, -1)}
                      className={`p-2 rounded hover:bg-gray-100 ${
                        answer.user_vote === -1 ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Answer content */}
                  <div className="flex-1">
                    {answer.is_accepted && (
                      <div className="mb-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Accepted Answer
                        </span>
                      </div>
                    )}

                    <div 
                      className="prose max-w-none mb-4"
                      dangerouslySetInnerHTML={{ __html: answer.content }}
                    />

                    {/* Answer meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Answered {new Date(answer.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {answer.user && (
                          <span className="font-medium text-gray-900">{answer.user.username}</span>
                        )}
                        {user && (question.user_id === user.id || user.role === 'admin') && !answer.is_accepted && (
                          <button
                            onClick={() => handleAcceptAnswer(answer.id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            {user.role === 'admin' ? 'Accept (Admin)' : 'Accept'}
                          </button>
                        )}
                        {user && (question.user_id === user.id || user.role === 'admin') && answer.is_accepted && (
                          <button
                            onClick={() => handleUnacceptAnswer(answer.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            {user.role === 'admin' ? 'Unaccept (Admin)' : 'Unaccept'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No answers yet. Be the first to answer!</p>
          </div>
        )}
      </div>

      {/* Post Answer */}
      {user ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
          {showAnswerForm ? (
            <div>
              <RichTextEditor
                value={newAnswer}
                onChange={setNewAnswer}
                placeholder="Write your answer..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handlePostAnswer}
                  disabled={postAnswerMutation.isPending}
                  className="btn btn-primary"
                >
                  {postAnswerMutation.isPending ? 'Posting...' : 'Post Answer'}
                </button>
                <button
                  onClick={() => setShowAnswerForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAnswerForm(true)}
              className="btn btn-primary btn-md"
            >
              Write an Answer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <p className="text-gray-600 mb-4">Please log in to post an answer.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
          >
            Log In
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail; 
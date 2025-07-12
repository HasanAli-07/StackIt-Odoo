import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { questionsApi } from '../services/api'
import { Question, Tag } from '../types'
import { MessageSquare, Eye, ThumbsUp, Clock, Tag as TagIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '../contexts/NotificationContext'

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const { showToast } = useNotifications()

  const page = parseInt(searchParams.get('page') || '1')

  const { data, isLoading, error, refetch } = useQuery(
    ['questions', { page, sortBy, selectedTag, searchQuery }],
    () => questionsApi.getQuestions({
      page,
      limit: 10,
      sort: sortBy,
      tag: selectedTag || undefined,
      search: searchQuery || undefined,
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on rate limit errors
        if (error?.response?.status === 429) {
          showToast('warning', 'Rate limit exceeded. Please wait before trying again.')
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  )

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    setSearchParams(prev => {
      prev.set('sort', newSort)
      prev.set('page', '1')
      return prev
    })
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag)
    setSearchParams(prev => {
      prev.set('tag', tag)
      prev.set('page', '1')
      return prev
    })
  }

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString())
      return prev
    })
  }

  const clearFilters = () => {
    setSelectedTag('')
    setSearchQuery('')
    setSearchParams({})
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    const isRateLimitError = (error as any)?.response?.status === 429
    
    return (
      <div className="text-center py-8">
        {isRateLimitError ? (
          <div>
            <p className="text-orange-600 mb-4">Too many requests. Please wait a moment before trying again.</p>
            <button 
              onClick={() => refetch()} 
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            <p className="text-red-600">Failed to load questions. Please try again.</p>
            <button 
              onClick={() => refetch()} 
              className="btn btn-primary mt-2"
            >
              Retry
            </button>
          </div>
        )}
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  // Debug: Show data structure
  console.log('Home component data:', data)
  console.log('Data type:', typeof data)
  console.log('Data.data:', data?.data)
  console.log('Data.data length:', data?.data?.length)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedTag ? `Questions tagged "${selectedTag}"` : 
             searchQuery ? `Search results for "${searchQuery}"` : 
             'All Questions'}
          </h1>
          {data && (
            <p className="text-gray-600 mt-1">
              {(data?.length ?? 0)} question{(data?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        {(selectedTag || searchQuery) && (
          <button
            onClick={clearFilters}
            className="btn btn-outline btn-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="input w-auto"
        >
          <option value="newest">Newest</option>
          <option value="votes">Most Voted</option>
          <option value="views">Most Viewed</option>
          <option value="unanswered">Unanswered</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {(data ?? []).map((question: Question) => (
          <div key={question.id} className="card p-6">
            <div className="flex gap-4">
              {/* Stats */}
              <div className="flex flex-col items-center text-sm text-gray-500 space-y-1 min-w-[60px]">
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{question.votes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{question.answer_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{question.views}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <Link
                  to={`/questions/${question.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {question.title}
                </Link>
                
                <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {question.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                  {question.description.length > 200 && '...'}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {question.tags?.map((tag: Tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagClick(tag.name)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag.name}
                      </button>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>
                      Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                    </span>
                    {question.user && (
                      <span>
                        by {question.user.username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {false && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Page {page} of 1
            </span>
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(data?.length ?? 0) === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MessageSquare className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No questions found
          </h3>
          <p className="text-gray-600">
            {selectedTag || searchQuery 
              ? 'Try adjusting your search criteria or browse all questions.'
              : 'Be the first to ask a question!'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default Home 
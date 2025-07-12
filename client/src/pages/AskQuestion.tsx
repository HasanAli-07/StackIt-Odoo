import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import { questionsApi } from '../services/api'
import { useNotifications } from '../contexts/NotificationContext'
import RichTextEditor from '../components/RichTextEditor'
import { Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'

const AskQuestion = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const { refreshNotifications, refreshUnreadCount } = useNotifications()

  const createQuestionMutation = useMutation(questionsApi.createQuestion, {
    onSuccess: (data) => {
      toast.success('Question created successfully!')
      // Refresh notifications after creating question
      refreshNotifications();
      refreshUnreadCount();
      navigate(`/questions/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create question')
    }
  })

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!description.trim()) {
      toast.error('Description is required')
      return
    }

    if (tags.length === 0) {
      toast.error('At least one tag is required')
      return
    }

    setIsLoading(true)
    try {
      await createQuestionMutation.mutateAsync({
        title: title.trim(),
        description,
        tags
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ask a Question</h1>
        <p className="text-gray-600 mt-2">
          Share your knowledge and help others learn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your question? Be specific."
            className="input"
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">
            {title.length}/200 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <RichTextEditor
            content={description}
            onChange={setDescription}
            placeholder="Provide more context about your question. You can use formatting options above."
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags (press Enter to add)"
                className="input flex-1"
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="btn btn-outline"
              >
                Add
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:text-primary-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-sm text-gray-500">
              Add up to 5 tags to help others find your question. {tags.length}/5
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="spinner mr-2"></div>
                Creating question...
              </div>
            ) : (
              'Post Question'
            )}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-outline btn-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AskQuestion 
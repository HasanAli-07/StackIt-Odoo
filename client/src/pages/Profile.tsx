import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMutation } from 'react-query'
import { authApi } from '../services/api'
import { User, Mail, Edit3, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const Profile = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || ''
  })

  const updateProfileMutation = useMutation(authApi.updateProfile, {
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfileMutation.mutateAsync(formData)
  }

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || ''
    })
    setIsEditing(false)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and profile information
        </p>
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-outline btn-sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input"
                required
              />
            ) : (
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{user.username}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                required
              />
            ) : (
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{user.email}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="textarea"
                rows={4}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-900">
                  {user.bio || 'No bio provided'}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{user.reputation}</div>
                <div className="text-sm text-gray-600">Reputation</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Member since</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="btn btn-primary"
              >
                {updateProfileMutation.isLoading ? (
                  <div className="flex items-center">
                    <div className="spinner mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-outline"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Profile 
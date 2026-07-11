import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { TbCamera, TbUserPlus } from 'react-icons/tb';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: errorsProfile } } = useForm({
    defaultValues: { name: user?.name }
  });
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: errorsPassword } } = useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onUpdateProfile = async (data) => {
    setProfileLoading(true);
    try {
      const payload = { ...data };
      if (selectedFile) payload.avatar = selectedFile;
      const res = await userService.updateProfile(payload);
      setUser(res.data.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (data) => {
    setPasswordLoading(true);
    try {
      await userService.changePassword(data);
      toast.success('Password changed successfully!');
      resetPassword();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Profile Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your account information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card / Avatar */}
        <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary-800 flex items-center justify-center text-white text-3xl font-bold border border-primary-750/50 overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-500 cursor-pointer rounded-full border border-surface-900 transition-colors">
              <TbCamera size={16} />
              <input type="file" onChange={handleAvatarChange} className="hidden" accept="image/*" />
            </label>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-surface-450">{user?.email}</p>
          </div>
        </div>

        {/* Profile Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile */}
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Personal Information</h3>
            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              <div>
                <label className="label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  className={errorsProfile.name ? 'input-error' : 'input'}
                  {...registerProfile('name', { required: 'Name is required' })}
                />
                {errorsProfile.name && <p className="error-text">{errorsProfile.name.message}</p>}
              </div>

              <button type="submit" disabled={profileLoading} className="btn-primary">
                {profileLoading ? 'Saving...' : 'Save Details'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Security</h3>
            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              <div>
                <label className="label" htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  className={errorsPassword.currentPassword ? 'input-error' : 'input'}
                  {...registerPassword('currentPassword', { required: 'Current password is required' })}
                />
                {errorsPassword.currentPassword && <p className="error-text">{errorsPassword.currentPassword.message}</p>}
              </div>

              <div>
                <label className="label" htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className={errorsPassword.newPassword ? 'input-error' : 'input'}
                  {...registerPassword('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                {errorsPassword.newPassword && <p className="error-text">{errorsPassword.newPassword.message}</p>}
              </div>

              <button type="submit" disabled={passwordLoading} className="btn-primary">
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { postsApi } from '../api';
import { getErrorMessage } from '../api/client';
import useAuth from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const MAX_TITLE = 200;
const MAX_CONTENT = 50000;

function validate({ title, content }) {
  const errors = {};
  if (title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (content.trim().length < 10) errors.content = 'Content must be at least 10 characters';
  return errors;
}

export default function PostEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isEdit = Boolean(slug);

  const [postId, setPostId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    postsApi
      .getBySlug(slug)
      .then(({ data }) => {
        if (!isAdmin && data.author?._id !== user?._id) {
          setLoadError('You can only edit your own posts.');
          return;
        }
        setPostId(data._id);
        setForm({ title: data.title, content: data.content });
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [isEdit, slug, isAdmin, user?._id]);

  const onChange = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      const { data } = isEdit ? await postsApi.update(postId, form) : await postsApi.create(form);
      toast.success(isEdit ? 'Post updated' : 'Post published');
      navigate(`/posts/${data.slug}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner fullPage />;
  if (loadError) return <ErrorMessage message={loadError} />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{isEdit ? 'Edit post' : 'Write a new post'}</h1>
      <form onSubmit={onSubmit} className="card space-y-5 p-6" noValidate>
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="input text-lg"
            value={form.title}
            onChange={onChange}
            maxLength={MAX_TITLE}
            placeholder="A catchy title"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>
        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            className="input min-h-80 leading-relaxed"
            value={form.content}
            onChange={onChange}
            maxLength={MAX_CONTENT}
            placeholder="Tell your story…"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-red-600">{errors.content}</span>
            <span className="text-slate-400">{form.content.length.toLocaleString()} characters</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}

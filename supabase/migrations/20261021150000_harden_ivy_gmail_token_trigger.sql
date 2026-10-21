-- Prevent objects in writable schemas from shadowing names used by this trigger.
-- The trigger only updates NEW.updated_at and calls the built-in now().
ALTER FUNCTION public.ivy_gmail_tokens_set_updated_at() SET search_path = '';

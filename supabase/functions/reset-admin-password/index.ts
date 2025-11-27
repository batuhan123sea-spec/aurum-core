import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the admin user
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (profileError || !profiles) {
      console.error('Admin profile not found:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Admin kullanıcısı bulunamadı' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reset admin password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profiles.id,
      { password: 'admin123' }
    );

    if (updateError) {
      console.error('Password reset error:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Şifre sıfırlanamadı: ' + updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin password reset successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin şifresi başarıyla sıfırlandı',
        credentials: {
          username: 'admin',
          password: 'admin123'
        }
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

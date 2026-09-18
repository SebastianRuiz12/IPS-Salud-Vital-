package com.ipssaludvital.app;
import android.content.Intent;import android.os.Bundle;import android.widget.*;import androidx.appcompat.app.AppCompatActivity;import java.util.concurrent.Executors;import org.json.JSONObject;
public class LoginActivity extends AppCompatActivity{
 EditText doc,pass; TextView error; Button login; ApiClient api=new ApiClient();
 @Override protected void onCreate(Bundle b){super.onCreate(b);setContentView(R.layout.activity_login);doc=findViewById(R.id.edtDocument);pass=findViewById(R.id.edtPassword);error=findViewById(R.id.txtError);login=findViewById(R.id.btnLogin);login.setOnClickListener(v->doLogin());}
 void doLogin(){String d=doc.getText().toString().trim(),p=pass.getText().toString();error.setText("");if(d.isEmpty()||p.isEmpty()){error.setText("Ingresa documento y contraseña.");return;}login.setEnabled(false);Executors.newSingleThreadExecutor().execute(()->{try{ // Para MVP móvil: documento se mapea a paciente demo; login API usa usuario del personal.
     JSONObject r=api.patientLogin(d,p); runOnUiThread(()->{getSharedPreferences("session",MODE_PRIVATE).edit().putString("token",r.optString("token")).putString("document",d).apply();startActivity(new Intent(this,DashboardActivity.class));finish();});
 }catch(Exception e){runOnUiThread(()->{error.setText(e.getMessage());login.setEnabled(true);});}});}
}

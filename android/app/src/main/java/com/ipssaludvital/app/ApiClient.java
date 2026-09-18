package com.ipssaludvital.app;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ApiClient {
    // Android Emulator: 10.0.2.2. Dispositivo físico: reemplaza por la IP local de tu PC.
    public static String BASE_URL = "http://10.0.2.2:4000/api";
    private String request(String method,String path,String body,String token) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(BASE_URL+path).openConnection();
        c.setRequestMethod(method); c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setRequestProperty("Content-Type","application/json");
        if(token!=null) c.setRequestProperty("Authorization","Bearer "+token);
        if(body!=null){c.setDoOutput(true);try(OutputStream o=c.getOutputStream()){o.write(body.getBytes(StandardCharsets.UTF_8));}}
        int code=c.getResponseCode(); InputStream is=code>=400?c.getErrorStream():c.getInputStream();
        String text; try(BufferedReader r=new BufferedReader(new InputStreamReader(is,StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String line;while((line=r.readLine())!=null)b.append(line);text=b.toString();}
        if(code>=400) throw new Exception(new JSONObject(text).optString("message","Error de conexión"));
        return text;
    }
    public JSONObject login(String username,String password)throws Exception{return new JSONObject(request("POST","/auth/login",new JSONObject().put("username",username).put("password",password).toString(),null));}
    public JSONObject patientLogin(String document,String password)throws Exception{return new JSONObject(request("POST","/auth/patient-login",new JSONObject().put("document",document).put("password",password).toString(),null));}
    public JSONArray appointments(String token)throws Exception{return new JSONArray(request("GET","/patient/appointments",null,token));}
    public JSONArray notifications(String token)throws Exception{return new JSONArray(request("GET","/patient/notifications",null,token));}
}

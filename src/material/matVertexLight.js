//逐顶点光照材质，支持 diffuse 贴图

import { Material, SystemUniforms } from "./material";
import { VertexSemantic } from "../core/vertexFormat";
import { LightMode } from "./renderPass";
import { gl } from "../core/gl";

let vs_forwardbase = `
attribute vec4 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Texcoord;
    
uniform mat4 u_mvpMatrix;
uniform mat4 u_world2Object;
uniform mat4 u_object2World;

uniform vec3 u_worldCameraPos; // world space camera position
uniform vec3 u_LightColor; // Light color
uniform vec4 u_worldLightPos;   // World space light direction or position, if w==0 the light is directional

uniform vec3 u_ambient; // scene ambient
uniform vec3 u_specular; // specular;
uniform float u_gloss; //gloss

uniform vec4 u_texMain_ST; // Main texture tiling and offset

varying vec3 v_color;
varying vec2 v_texcoord;

void main(){
    gl_Position = u_mvpMatrix * a_Position;   
    
    vec4 worldPos = u_object2World*a_Position;
    
    vec3 worldNormal = normalize(a_Normal * mat3(u_world2Object));
    vec3 worldLightDir;
    float atten = 1.0;    

    if(u_worldLightPos.w==1.0){ //点光源
        vec3 lightver = u_worldLightPos.xyz-worldPos.xyz;
        float dis = length(lightver);
        worldLightDir = normalize(lightver);
        vec3 a = vec3(0.01);
        atten = 1.0/(a.x + a.y*dis + a.z*dis*dis);
    } else {
        worldLightDir = normalize(u_worldLightPos.xyz);
    }
    
    vec3 diffuse = u_LightColor * max(0.0, dot(worldLightDir, worldNormal));
    
    vec3 reflectDir = normalize(reflect(-worldLightDir, worldNormal));
    vec3 viewDir = normalize(u_worldCameraPos - worldPos.xyz);
    vec3 specular = u_specular * u_LightColor * pow(max(0.0, dot(reflectDir,viewDir)), u_gloss);

    v_color = u_ambient + (diffuse + specular)*atten;    
    v_texcoord = a_Texcoord.xy * u_texMain_ST.xy + u_texMain_ST.zw;
}

`;

let fs_forwardbase = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_texMain;
uniform vec3 u_colorTint;

varying vec3 v_color;
varying vec2 v_texcoord;


void main(){
    vec3 albedo = texture2D(u_texMain, v_texcoord).rgb * u_colorTint;
    gl_FragColor = vec4(v_color * albedo, 1.0);
}

`;


let vs_forwardadd = `
attribute vec4 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Texcoord;
    
uniform mat4 u_mvpMatrix;
uniform mat4 u_world2Object;
uniform mat4 u_object2World;

uniform vec3 u_worldCameraPos; // world space camera position
uniform vec3 u_LightColor; // Light color
uniform vec4 u_worldLightPos;   // World space light direction or position, if w==0 the light is directional

uniform vec3 u_specular; // specular;
uniform float u_gloss; //gloss

uniform vec4 u_texMain_ST; // Main texture tiling and offset

varying vec3 v_color;
varying vec2 v_texcoord;

void main(){
    gl_Position = u_mvpMatrix * a_Position;   
    
    vec4 worldPos = u_object2World*a_Position;
    
    vec3 worldNormal = normalize(a_Normal * mat3(u_world2Object));
    vec3 worldLightDir;
    float atten = 1.0;

    if(u_worldLightPos.w==1.0){ //点光源
        vec3 lightver = u_worldLightPos.xyz-worldPos.xyz;
        float dis = length(lightver);
        worldLightDir = normalize(lightver);
        vec3 a = vec3(0.01);
        atten = 1.0/(a.x + a.y*dis + a.z*dis*dis);
    } else {
        worldLightDir = normalize(u_worldLightPos.xyz);
    }
    
    vec3 diffuse = u_LightColor * max(0.0, dot(worldLightDir, worldNormal));
    
    vec3 reflectDir = normalize(reflect(-worldLightDir, worldNormal));
    vec3 viewDir = normalize(u_worldCameraPos - worldPos.xyz);
    vec3 specular = u_specular * u_LightColor * pow(max(0.0, dot(reflectDir,viewDir)), u_gloss);

    v_color = (diffuse + specular)*atten;    
    v_texcoord = a_Texcoord.xy * u_texMain_ST.xy + u_texMain_ST.zw;
}

`;

let fs_forwardadd = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_texMain;
uniform vec3 u_colorTint;

varying vec3 v_color;
varying vec2 v_texcoord;

void main(){
    vec3 albedo = texture2D(u_texMain, v_texcoord).rgb * u_colorTint;
    gl_FragColor = vec4(v_color * albedo, 1.0);  
}

`;

let g_shaderForwardBase = null;
let g_shaderForwardAdd = null;

class MatVertexLight extends Material{
    constructor(){
        super();
        
        if(g_shaderForwardBase==null){
            g_shaderForwardBase = Material.createShader(vs_forwardbase, fs_forwardbase, [
                {'semantic':VertexSemantic.POSITION, 'name':'a_Position'},
                {'semantic':VertexSemantic.NORMAL , 'name':'a_Normal'},
                {'semantic':VertexSemantic.UV0 , 'name':'a_Texcoord'}
            ]);
        }
        if(g_shaderForwardAdd==null){
            g_shaderForwardAdd = Material.createShader(vs_forwardadd, fs_forwardadd, [
                {'semantic':VertexSemantic.POSITION, 'name':'a_Position'},
                {'semantic':VertexSemantic.NORMAL , 'name':'a_Normal'},
                {'semantic':VertexSemantic.UV0 , 'name':'a_Texcoord'}
            ]);
        }        

        this.addRenderPass(g_shaderForwardBase, LightMode.ForwardBase);  
        this.addRenderPass(g_shaderForwardAdd, LightMode.ForwardAdd);                

        //default uniforms
        this._mainTexture = null; //TODO: 系统提供默认纹理（如白色，黑白格）
        this._mainTexture_ST = [1,1,0,0];
        this._specular = [1.0, 1.0, 1.0];
        this._gloss = 20.0;  
        this._colorTint = [1.0, 1.0, 1.0];  
    }

    //Override
    get systemUniforms(){
        return [SystemUniforms.MvpMatrix,
            SystemUniforms.World2Object,
            SystemUniforms.Object2World,
            SystemUniforms.WorldCameraPos,
            SystemUniforms.SceneAmbient,
            SystemUniforms.LightColor, SystemUniforms.WorldLightPos]; 
    }

    //Override
    setCustomUniformValues(pass){                           
        pass.shader.setUniformSafe('u_specular', this._specular);
        pass.shader.setUniformSafe('u_gloss', this._gloss);
        pass.shader.setUniformSafe('u_colorTint', this._colorTint);
        pass.shader.setUniformSafe('u_texMain_ST', this._mainTexture_ST);        
        this._mainTexture.bind();
        pass.shader.setUniformSafe('u_texMain', 0);
    }

    set specular(v){
        this._specular = v;
    }

    set gloss(v){
        this._gloss = v;
    }

    set colorTint(v){
        this._colorTint = v;
    }

    set mainTexture(v){
        this._mainTexture = v;
    }

    get mainTexture(){
        return this._mainTexture;
    }

    set mainTextureST(v){
        this._mainTexture_ST = v;
    }


}

export { MatVertexLight };
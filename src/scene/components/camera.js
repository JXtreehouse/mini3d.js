import { Matrix4 } from '../../math/matrix'

class Camera{
    constructor(){
        this._fovy = 75;
        this._aspect = 0.75;
        this._near = 0.1;
        this._far = 100.0;
        this._projMatrix = new Matrix4();
        this._viewMatrix = new Matrix4();
        this._viewProjMatrix = new Matrix4();
    }

    setNode(node){
        this.node = node;
    }

    getViewProjMatrix(){
        return this._viewProjMatrix;
    }

    setPerspective(fovy, aspect, near, far){
        this._fovy = fovy;
        this._aspect = aspect;
        this._near = near;
        this._far = far; 
        this._projMatrix.setPerspective(this._fovy, this._aspect, this._near, this._far);
    }

    setLookAt(){
        this._viewMatrix.setLookAt(.0, .0, 8.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    }

    onScreenResize(width, height){
        this._aspect = width/height;
        this._projMatrix.setPerspective(this._fovy, this._aspect, this._near, this._far);     
        
    }

    _updateViewProjMatrix(){
        this._viewProjMatrix.set(this._projMatrix);   
        this._viewProjMatrix.multiply(this._viewMatrix);
    }

    beforeRender(){
        //this._viewMatrix.setInverseOf(this.node.localMatrix); //TODO: use this, when look at done.
        this.setLookAt();
        this._updateViewProjMatrix();//TODO:不需要每次渲染之前都重新计算，当proj矩阵需重新计算（例如screen resize，动态修改fov之后），或camera的world matrix变化了需要重新计算view matrix

        let gl = mini3d.gl;

        //TODO:每个camera设置自己的clear color，并且在gl层缓存，避免重复设置相同的值
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        
    }

    afterRender(){

    }


}

export { Camera };
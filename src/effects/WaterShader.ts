import { Filter, GlProgram } from 'pixi.js';

const vertex = /* glsl */ `
  in vec2 aPosition;
  out vec2 vTextureCoord;

  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
  }

  vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
  }

  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

const fragment = /* glsl */ `
  in vec2 vTextureCoord;
  out vec4 finalColor;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;

  void main(void) {
    vec2 uv = vTextureCoord;

    // Layered wave displacement
    float wave1 = sin(uv.x * uFrequency + uTime * uSpeed) * uAmplitude;
    float wave2 = sin(uv.y * uFrequency * 1.3 + uTime * uSpeed * 0.7) * uAmplitude * 0.6;
    float wave3 = sin((uv.x + uv.y) * uFrequency * 0.8 + uTime * uSpeed * 1.2) * uAmplitude * 0.4;

    vec2 displaced = uv + vec2(wave1 + wave3, wave2 + wave3);

    vec4 color = texture(uTexture, displaced);

    // Caustic-like light pattern overlay
    float caustic = sin(uv.x * uFrequency * 2.0 + uTime * uSpeed * 1.5)
                  * sin(uv.y * uFrequency * 2.0 + uTime * uSpeed * 1.1);
    caustic = caustic * 0.5 + 0.5; // normalize to 0..1
    color.rgb += vec3(caustic * 0.06);

    finalColor = color;
  }
`;

/** Animated water displacement filter for PixiJS v8 */
export class WaterFilter extends Filter {
  private _time = 0;

  constructor() {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'water-filter',
    });

    super({
      glProgram,
      resources: {
        waterUniforms: {
          uTime: { value: 0, type: 'f32' },
          uAmplitude: { value: 0.003, type: 'f32' },
          uFrequency: { value: 15.0, type: 'f32' },
          uSpeed: { value: 1.5, type: 'f32' },
        },
      },
    });
  }

  /** Call each frame with elapsed ms */
  update(deltaMs: number): void {
    this._time += deltaMs * 0.001;
    this.resources.waterUniforms.uniforms.uTime = this._time;
  }
}

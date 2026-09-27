export type Faction = 'blue' | 'red' | 'green' | 'yellow';

export type Branch = 
  | 'infantry'      // 步兵
  | 'armor'         // 装甲/坦克
  | 'mech_infantry' // 机械化步兵
  | 'artillery'     // 炮兵/火箭炮
  | 'air_defense'   // 防空导弹/高炮
  | 'aviation'      // 陆军航空兵/武装直升机
  | 'recon'         // 侦察兵
  | 'engineer'      // 工兵/破障
  | 'signals'       // 通信/电子对抗
  | 'specops'       // 特种作战
  | 'hq'            // 指挥所
  | 'naval'         // 海军/海军陆战队
  | 'drone'         // 无人机/巡飞弹
  | 'logistics';    // 综合后勤补给

export type Echelon = 
  | 'squad'     // 班 (•)
  | 'platoon'   // 排 (••)
  | 'company'   // 连 (•••)
  | 'battalion' // 营 (|)
  | 'regiment'  // 团 (||)
  | 'brigade'   // 旅 (X)
  | 'division'  // 师 (XX)
  | 'corps'     // 军 (XXX)
  | 'army';     // 集团军 (XXXX)

export type UnitStatus = 
  | 'ready'     // 战备集结
  | 'marching'  // 战术机动/开进
  | 'engaged'   // 交火交战中
  | 'defending' // 坚守抗击
  | 'assault'   // 突击冲锋
  | 'damaged'   // 受损减员
  | 'rest';     // 休整待命

export interface Point {
  x: number;
  y: number;
}

export interface UnitElement {
  id: string;
  type: 'unit';
  layerId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  faction: Faction;
  branch: Branch;
  echelon: Echelon;
  name: string;             // 部队番号，如 "合成第一旅突击一营"
  callsign: string;         // 代号/呼号，如 "猛虎-01"
  strength: string;         // 兵力，如 "420人 / 31辆99A"
  combatPower: number;      // 战斗力指数 0-100
  status: UnitStatus;
  note?: string;
  customIconUrl?: string;   // 自定义图标
  createdAt: number;
}

export type ArrowType = 
  | 'assault'       // 突击/主攻方向箭头 (多点宽体收束箭头)
  | 'flank'         // 迂回穿插/助攻箭头
  | 'pincer'        // 钳形向心合围双箭头
  | 'defense_line'  // 坚守防御阵地线 (带齿形阻击标)
  | 'blocking_line' // 封锁阻绝断线
  | 'support'       // 协同支援虚线箭头
  | 'fire_strike'   // 炮火/空袭覆盖打击圆
  | 'assembly_zone' // 集结/空降/设伏多边形地域
  | 'freehand';     // 战术自由手绘线

export interface ArrowElement {
  id: string;
  type: 'arrow';
  arrowType: ArrowType;
  layerId: string;
  points: Point[];          // 控制点
  color: string;
  strokeWidth: number;
  opacity: number;
  dashed?: boolean;
  label?: string;           // 战术意图标注，如 "第2阶段主攻轴线"
  radius?: number;          // 针对打击圈/集结地域
  animated?: boolean;       // 是否播放推进动效
  createdAt: number;
}

export interface TextElement {
  id: string;
  type: 'text';
  layerId: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  border?: boolean;
  createdAt: number;
}

export type TacticalElement = UnitElement | ArrowElement | TextElement;

export interface TacticalLayer {
  id: string;
  name: string;
  phaseCode: string;        // 阶段标识，如 "阶段一", "阶段二"
  visible: boolean;
  locked: boolean;
  opacity: number;
  color: string;
}

export interface TacticalState {
  version: string;
  scenarioName: string;
  drillCode: string;
  classification: string;   // 密级: 绝密 / 机密 / 内部推演
  layers: TacticalLayer[];
  elements: TacticalElement[];
  activeLayerId: string;
  mapConfig: TacticalMapConfig;
  notes: string;
  updatedAt: number;
}

export type MapPresetType = 
  | 'satellite_tactical'  // 卫星遥感态势图
  | 'topographic_sand'    // 等高线地貌沙盘
  | 'radar_night_grid'    // 夜视雷达战术网格
  | 'coastal_defense'     // 岛礁海岸防御区
  | 'desert_mountain'     // 荒漠戈壁高地
  | 'custom_image'        // 本地文件导入底图
  | 'online_map_plugin';  // 在线地图插件 / 谷歌地图 / 百度地图 / 外部URL导入

export type OnlineMapProvider = 
  | 'google_satellite'   // 谷歌遥感卫星图
  | 'google_terrain'     // 谷歌地形高程图
  | 'baidu_style'        // 百度风格态势图
  | 'osm_standard'       // OSM开源全球地理底图
  | 'custom_url';        // 用户自定义自绘地图在线链接 (URL)

export interface BaseMapAdapterConfig {
  adapterMode: 'auto' | 'iframe_embed' | 'safe_loader_snapshot';
  sourceType: 'google_my_maps' | 'google_static' | 'baidu_static' | 'osm' | 'custom_url';
  url: string;
  embedUrl?: string;
  snapshotUrl?: string;
  corsMode: 'anonymous' | 'no-cors';
  status: 'ready' | 'loading' | 'error';
  errorMessage?: string;
  lastVerifiedAt?: number;
}

export interface TacticalMapConfig {
  preset: MapPresetType;
  customImageUrl?: string;
  customImageWidth?: number;
  customImageHeight?: number;
  onlineMapType?: OnlineMapProvider;
  onlineMapUrl?: string;       // 谷歌地图/百度地图/用户自绘地图的Web在线链接
  embedMapUrl?: string;        // 谷歌My Maps / 外部地图 iframe 嵌入模式链接
  mapLayerType?: 'canvas_image' | 'iframe_webmap'; // 底图展现形式
  adapterConfig?: BaseMapAdapterConfig;            // 通用底图插件适配器配置
  interactiveBaseMap?: boolean;// 是否激活底层地图拖拽缩放
  onlineMapAttribution?: string;
  brightness: number;     // 50% - 150%
  contrast: number;
  gridVisible: boolean;
  gridColor: string;
  showCoordinates: boolean;
  scaleMetric: string;    // e.g. "1 : 25,000"
}

export interface UnitDeployTemplate {
  faction: Faction;
  branch: Branch;
  echelon: Echelon;
  name: string;
  callsign: string;
  strength: string;
  combatPower: number;
  status: UnitStatus;
  scale: number;
  autoIncrement: boolean;
  counter: number;
  customIconUrl?: string;
}

export type StaffRole = 
  | 'commander'   // 作战指挥长
  | 'operations'  // 作战参谋
  | 'firepower'   // 火力协同参谋
  | 'intelligence'; // 侦察情报参谋

export interface CollabStaff {
  id: string;
  name: string;
  role: StaffRole;
  color: string;
  cursor?: { x: number; y: number };
  activeLayerId?: string;
  lastActive: number;
}

export interface TacticalLogMessage {
  id: string;
  timestamp: string;
  staffName: string;
  role: StaffRole;
  text: string;
  type: 'order' | 'intel' | 'status' | 'strike';
}

/**
 * 战术态势阶段/图层对比视图配置
 */
export interface TacticalCompareConfig {
  isActive: boolean;
  layerAId: string;
  layerBId: string;
  sliderValue: number; // 0 (100% A) -> 50 (50/50 叠放) -> 100 (100% B)
  mode: 'crossfade' | 'curtain' | 'blink'; // 透明度叠放 | 卷帘分屏 | A/B交替闪烁
  blendStyle: 'crossfade' | 'overlay'; // 交叉淡入淡出 vs 基准层常驻叠合
  showTrajectories: boolean; // 是否绘制两阶段间兵力机动位移路线
  showDeltaSummary: boolean; // 是否展开态势差异量化面板
}


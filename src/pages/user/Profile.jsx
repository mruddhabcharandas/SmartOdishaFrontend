import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/AuthContext'

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify }        = useToast()
  const { token, refreshProfile } = useAuth()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [isKycComplete, setIsKycComplete] = useState(false)

  const EMPTY = { businessName:'', gstin:'', pan:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'' }
  const [kyc,   setKyc]   = useState(EMPTY)   // saved / server state
  const [draft, setDraft] = useState(EMPTY)   // in-flight edits
  const [locLoading, setLocLoading] = useState(false)

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ]

  const DISTRICTS_BY_STATE = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Noklak", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
    "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Prayagraj", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
    "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
    "Ladakh": ["Kargil", "Leh"],
    "Lakshadweep": ["Lakshadweep"],
    "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
  }

  const detectLocation = () => {
    if (!navigator.geolocation) return notify('Geolocation is not supported by your browser', 'error')
    
    setLocLoading(true)
    
    const fetchWithZoom = async (lat, lon, zoomLevel) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=${zoomLevel}&addressdetails=1&accept-language=en`)
        const data = await res.json()
        return { data }
      } catch (e) { return { data: null } }
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        
        // Using zoom 18 for best address details
        let { data } = await fetchWithZoom(latitude, longitude, 18)
        
        if (data && data.address) {
          const addr = data.address
          const newState = {
            ...draft,
            // Pincode removed - user fills manually
            city: addr.city || addr.town || addr.village || addr.suburb || addr.district || draft.city,
            district: addr.state_district || addr.county || addr.district || draft.district,
            state: addr.state || draft.state,
            addressLine1: [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 2).join(',').trim() || draft.addressLine1,
            addressLine2: [addr.county, addr.state_district].filter(Boolean).join(', ') || data.display_name.split(',').slice(2, 4).join(',').trim() || draft.addressLine2
          }
          setDraft(newState)
          notify('Address details detected! Please fill your pincode manually.', 'success')
        }
      } catch (err) {
        notify('Failed to fetch address from location', 'error')
      } finally {
        setLocLoading(false)
      }
    }, () => {
      setLocLoading(false)
      notify('Location access denied. Please enable GPS.', 'error')
    }, { enableHighAccuracy: true, timeout: 15000 })
  }

  useEffect(() => {
    if (!token) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    ;(async () => {
      try {
        const { data } = await api.get('/api/user/me')
        const filled = { ...EMPTY, ...(data.kyc || {}) }
        setIsKycComplete(!!data.isKycComplete)
        setKyc(filled)
        setDraft(filled)
        if (!data.isKycComplete) setEditing(true)   // auto-open edit for new users
      } finally { setLoading(false) }
    })()
  }, [token])

  const startEdit  = () => { setDraft({ ...kyc }); setEditing(true) }
  const cancelEdit = () => { setDraft({ ...kyc }); setEditing(false) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/api/user/kyc', draft)
      setIsKycComplete(data.isKycComplete)
      setKyc({ ...draft })
      notify(data.isKycComplete ? 'KYC completed successfully!' : 'KYC details updated', 'success')
      refreshProfile()
      setEditing(false)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to save KYC', 'error')
    } finally { setSaving(false) }
  }

  /* ─── LOADING ─── */
  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;700&display=swap');
        .pf-load-root { font-family:'DM Sans',sans-serif; background:#f5f3ff; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px; position:relative; overflow:hidden; }
        .pf-load-root::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 2px 2px, rgba(124,58,237,.04) 1px, transparent 0); background-size:40px 40px; }
        
        .pf-load-avatar { width:90px; height:90px; background:white; border-radius:32px; box-shadow:0 12px 32px rgba(124,58,237,.15); border:1px solid rgba(124,58,237,.1); display:flex; align-items:center; justify-content:center; position:relative; z-index:1; }
        .pf-load-avatar::after { content:''; position:absolute; inset:-4px; border:2px solid #7c3aed; border-radius:36px; opacity:.2; animation:pfPulse 2s ease-out infinite; }
        .pf-load-avatar span { font-size:36px; }
        
        .pf-load-txt-w { text-align:center; z-index:1; }
        .pf-load-h { font-family:'Bebas Neue',sans-serif; font-size:26px; color:#1e1b2e; letter-spacing:.05em; margin-bottom:2px; }
        .pf-load-p { font-size:10px; font-weight:800; color:#7c3aed; text-transform:uppercase; letter-spacing:.25em; opacity:.5; }
        
        @keyframes pfPulse { 0% { transform:scale(.9); opacity:.8; } 100% { transform:scale(1.3); opacity:0; } }
      `}</style>
      <div className="pf-load-root">
        <div className="pf-load-avatar">
          <span>👤</span>
        </div>
        <div className="pf-load-txt-w">
          <h2 className="pf-load-h">Profile Center</h2>
          <p className="pf-load-p">Preparing your workspace…</p>
        </div>
      </div>
    </>
  )

  /* ─── MAIN ─── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── base ── */
        .pf-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background:#f5f3ff; min-height:100vh; color:#1e1b2e;
          position:relative; overflow-x:hidden;
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .pf-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:
            linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px);
          background-size:60px 60px;
        }
        .pf-blob{
          position:fixed; top:-180px; left:50%; transform:translateX(-50%);
          width:800px; height:500px; border-radius:50%; pointer-events:none; z-index:0;
          background:radial-gradient(ellipse,rgba(139,92,246,0.08),transparent 65%);
        }
        .pf-wrap{
          max-width:860px; margin:0 auto;
          padding:36px 16px 80px; position:relative; z-index:1;
        }
        @media(min-width:600px){.pf-wrap{padding:48px 28px 80px;}}

        /* ── page header ── */
        .pf-page-hd{
          display:flex; align-items:flex-start; justify-content:space-between;
          flex-wrap:wrap; gap:14px; margin-bottom:28px;
          animation:pfUp .6s ease both;
        }
        .pf-eyebrow{
          display:inline-flex; align-items:center; gap:7px;
          padding:5px 14px; border-radius:100px;
          background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.22);
          color:#7c3aed; font-size:9px; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
          margin-bottom:10px;
        }
        .pf-edot{
          width:5px; height:5px; border-radius:50%;
          background:#7c3aed; box-shadow:0 0 5px rgba(124,58,237,.5);
          animation:pfpulse 2s ease infinite;
        }
        @keyframes pfpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .pf-h1{
          font-family:'Bebas Neue',sans-serif;
          font-size:clamp(34px,5vw,52px);
          color:#1e1b2e; letter-spacing:.02em; line-height:1; margin-bottom:6px;
        }
        .pf-h1 span{color:#7c3aed;}
        .pf-sub{font-size:13px; color:#6b7280; font-weight:400;}

        /* kyc status pill */
        .pf-kpill{
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:100px;
          font-size:11px; font-weight:700; letter-spacing:.04em; white-space:nowrap;
        }
        .pf-kpill.ok{background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.22);color:#059669;}
        .pf-kpill.pend{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:#d97706;}
        .pf-kdot{width:6px;height:6px;border-radius:50%;animation:pfpulse 2s ease infinite;}
        .ok   .pf-kdot{background:#059669;box-shadow:0 0 5px #059669;}
        .pend .pf-kdot{background:#d97706;box-shadow:0 0 5px #d97706;}

        /* ── card ── */
        .pf-card{
          background:white; border:1px solid rgba(139,92,246,0.14);
          border-radius:24px; overflow:hidden;
          box-shadow:0 4px 32px rgba(139,92,246,.07);
          position:relative;
          animation:pfUp .6s .1s ease both;
        }
        .pf-card::before{
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,transparent 10%,#7c3aed 50%,transparent 90%);
        }

        /* card header bar */
        .pf-bar{
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:10px;
          padding:20px 24px 18px;
          border-bottom:1px solid rgba(139,92,246,.08);
        }
        @media(max-width:480px){.pf-bar{padding:16px 18px 14px;}}
        .pf-bar-label{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af;
        }

        /* edit button */
        .pf-edit-btn{
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 18px; border-radius:10px;
          background:rgba(139,92,246,.08); border:1px solid rgba(139,92,246,.2);
          color:#7c3aed; font-size:11px; font-weight:700;
          letter-spacing:.1em; text-transform:uppercase;
          cursor:pointer; transition:all .2s; font-family:'DM Sans',sans-serif;
        }
        .pf-edit-btn:hover{background:rgba(139,92,246,.14);border-color:rgba(124,58,237,.4);transform:translateY(-1px);}

        /* ── VIEW MODE ── */
        .pf-view-wrap{padding:24px;}
        @media(max-width:480px){.pf-view-wrap{padding:18px;}}

        /* KYC incomplete banner inside card */
        .pf-warn{
          display:flex; align-items:center; gap:12px;
          background:rgba(245,158,11,.07); border:1px solid rgba(245,158,11,.2);
          border-radius:14px; padding:14px 18px; margin-bottom:24px;
        }
        .pf-warn-ico{
          width:34px; height:34px; border-radius:9px; flex-shrink:0;
          background:rgba(245,158,11,.14);
          display:flex; align-items:center; justify-content:center; font-size:17px;
        }
        .pf-warn-txt{font-size:13px;color:#92400e;font-weight:500;line-height:1.5;}
        .pf-warn-txt b{font-weight:700;display:block;margin-bottom:2px;}

        /* view grid — 2 col on tablet+ */
        .pf-vgrid{
          display:grid; grid-template-columns:1fr;
          border:1px solid rgba(139,92,246,.08); border-radius:16px; overflow:hidden;
        }
        @media(min-width:560px){.pf-vgrid{grid-template-columns:1fr 1fr;}}

        .pf-vfield{
          padding:16px 20px;
          border-bottom:1px solid rgba(139,92,246,.08);
          transition:background .2s;
        }
        .pf-vfield:hover{background:#faf8ff;}
        .pf-vfield.span2{grid-column:1/-1;}

        /* remove bottom border from last row */
        @media(min-width:560px){
          .pf-vfield:nth-last-child(1),
          .pf-vfield:nth-last-child(2):not(.span2){border-bottom:none;}
        }
        @media(max-width:559px){
          .pf-vfield:last-child{border-bottom:none;}
        }

        .pf-vlabel{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:5px;
        }
        .pf-vval{font-size:15px;font-weight:600;color:#1e1b2e;line-height:1.4;}
        .pf-vval.mt{font-size:13px;color:#c4b5fd;font-weight:400;font-style:italic;}

        /* ── EDIT MODE ── */
        .pf-form-wrap{padding:24px;}
        @media(max-width:480px){.pf-form-wrap{padding:18px;}}

        .pf-fgrid{
          display:grid; grid-template-columns:1fr; gap:16px;
        }
        @media(min-width:560px){.pf-fgrid{grid-template-columns:1fr 1fr;}}

        .pf-field{display:flex;flex-direction:column;gap:6px;}
        .pf-field.span2{grid-column:1/-1;}

        .pf-flabel{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#6b7280; padding-left:2px;
        }
        .pf-flabel em{color:#7c3aed;font-style:normal;}

        .pf-finput{
          width:100%; box-sizing:border-box;
          background:#f9f7ff; border:1px solid rgba(139,92,246,.18);
          border-radius:12px; padding:13px 16px;
          font-size:14px; font-weight:600; color:#1e1b2e;
          outline:none; font-family:'DM Sans',sans-serif; transition:all .2s;
        }
        .pf-finput::placeholder{color:#c4b5fd;font-weight:400;}
        .pf-finput:focus{
          border-color:rgba(124,58,237,.5); background:white;
          box-shadow:0 0 0 3px rgba(124,58,237,.08);
        }

        /* form footer */
        .pf-ffoot{
          display:flex; align-items:center; justify-content:flex-end;
          gap:10px; flex-wrap:wrap;
          padding:18px 24px 22px;
          border-top:1px solid rgba(139,92,246,.08);
        }
        @media(max-width:480px){
          .pf-ffoot{padding:14px 18px 18px; flex-direction:column-reverse;}
          .pf-ffoot > *{width:100%; justify-content:center;}
        }

        .pf-cancel{
          display:inline-flex; align-items:center; gap:6px;
          padding:11px 22px; border-radius:11px;
          background:white; border:1px solid rgba(139,92,246,.2);
          color:#6b7280; font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:.12em;
          cursor:pointer; transition:all .2s; font-family:'DM Sans',sans-serif;
        }
        .pf-cancel:hover{border-color:rgba(124,58,237,.35);color:#7c3aed;}

        .pf-save{
          display:inline-flex; align-items:center; gap:8px;
          padding:11px 28px; border-radius:11px;
          background:#7c3aed; color:white; border:none;
          font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:.14em;
          cursor:pointer; transition:all .25s; font-family:'DM Sans',sans-serif;
          box-shadow:0 6px 20px rgba(124,58,237,.28);
          position:relative; overflow:hidden;
        }
        .pf-save::before{
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,.12),transparent);
          opacity:0; transition:opacity .2s;
        }
        .pf-save:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(124,58,237,.4);}
        .pf-save:hover:not(:disabled)::before{opacity:1;}
        .pf-save:active:not(:disabled){transform:scale(.97);}
        .pf-save:disabled{opacity:.5;cursor:not-allowed;}

        .pf-spin2{
          width:13px; height:13px;
          border:2px solid rgba(255,255,255,.3); border-top-color:white;
          border-radius:50%; animation:pfs2 .7s linear infinite;
        }
        @keyframes pfs2{to{transform:rotate(360deg)}}

        @keyframes pfUp{
          from{opacity:0;transform:translateY(18px);}
          to  {opacity:1;transform:translateY(0);}
        }
      `}</style>

      <div className="pf-root">
        <div className="pf-blob" />
        <div className="pf-wrap">

          {/* ── PAGE HEADER ── */}
          <div className="pf-page-hd">
            <div>
              <div className="pf-eyebrow"><span className="pf-edot" /> My Account</div>
              <h1 className="pf-h1">Business <span>Profile</span></h1>
              <p className="pf-sub">Manage your KYC details to unlock wholesale ordering.</p>
            </div>
            <div className={`pf-kpill ${isKycComplete ? 'ok' : 'pend'}`}>
              <span className="pf-kdot" />
              {isKycComplete ? 'KYC Verified' : 'KYC Pending'}
            </div>
          </div>

          {/* ── CARD ── */}
          <div className="pf-card">

            {/* bar */}
            <div className="pf-bar">
              <span className="pf-bar-label">
                {editing ? 'Edit KYC Details' : 'KYC Information'}
              </span>
              {!editing && (
                <button className="pf-edit-btn" onClick={startEdit}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Edit Details
                </button>
              )}
            </div>

            {/* ── VIEW ── */}
            {!editing && (
              <div className="pf-view-wrap">
                {!isKycComplete && (
                  <div className="pf-warn">
                    <div className="pf-warn-ico">⚠️</div>
                    <div className="pf-warn-txt">
                      <b>KYC Incomplete</b>
                      Fill in your business details below to start placing wholesale orders.
                    </div>
                  </div>
                )}
                <div className="pf-vgrid">
                  <VF label="Business Name"  val={kyc.businessName} />
                  <VF label="GSTIN"          val={kyc.gstin} />
                  <VF label="PAN"            val={kyc.pan} />
                  <VF label="Pincode"        val={kyc.pincode} />
                  <VF label="State"          val={kyc.state} />
                  <VF label="District"       val={kyc.district} />
                  <VF label="City"           val={kyc.city} />
                  <VF label="Address Line 1" val={kyc.addressLine1} span2 />
                  <VF label="Address Line 2" val={kyc.addressLine2} span2 optional />
                </div>
              </div>
            )}

            {/* ── EDIT ── */}
            {editing && (
              <form onSubmit={save}>
                <div className="pf-form-wrap">
                  {/* Premium Quick Fill Section */}
                  <div className="mb-8 p-1 rounded-[22px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-100">
                    <div className="bg-white/95 backdrop-blur-sm p-5 rounded-[20px] flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.15em] mb-0.5">Instant Checkout</div>
                          <div className="text-sm font-black text-gray-900 leading-tight">Auto-fill Business Address</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-1">Uses precise GPS for faster KYC completion.</div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={detectLocation}
                        disabled={locLoading}
                        className="group relative overflow-hidden flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-gray-200"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          {locLoading ? <div className="pf-spin2" /> : '📍 Locate Me'}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>

                  <div className="pf-fgrid">
                    <EF label="Business Name"  val={draft.businessName}  set={v=>setDraft({...draft,businessName:v})}  req disabled={!!kyc.businessName} />
                    <EF label="GSTIN"          val={draft.gstin}         set={v=>setDraft({...draft,gstin:v})}          req disabled={!!kyc.gstin} />
                    <EF label="PAN"            val={draft.pan}           set={v=>setDraft({...draft,pan:v})}            req disabled={!!kyc.pan} />
                    <EF label="Pincode"        val={draft.pincode}       set={v=>setDraft({...draft,pincode:v})}        req />
                    <EF 
                      label="State" 
                      val={draft.state} 
                      set={v=>{
                        // Reset district and city when state changes
                        setDraft({...draft, state:v, district: '', city: ''})
                      }} 
                      req 
                      type="select" 
                      options={INDIAN_STATES} 
                    />
                    <EF 
                      label="District" 
                      val={draft.district} 
                      set={v=>setDraft({...draft,district:v, city: ''})} 
                      req 
                      type="select" 
                      options={draft.state ? (DISTRICTS_BY_STATE[draft.state] || []) : []}
                      disabled={!draft.state}
                    />
                    <EF label="City"           val={draft.city}          set={v=>setDraft({...draft,city:v})}           req disabled={!draft.district} />
                    <EF label="Address Line 1" val={draft.addressLine1}  set={v=>setDraft({...draft,addressLine1:v})}   req span2 />
                    <EF label="Address Line 2" val={draft.addressLine2}  set={v=>setDraft({...draft,addressLine2:v})}   span2 />
                  </div>
                  {(kyc.businessName || kyc.gstin || kyc.pan) && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-medium flex items-center gap-2">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Verified KYC fields (Business Name, GSTIN, PAN) cannot be edited.
                    </div>
                  )}
                </div>

                <div className="pf-ffoot">
                  {isKycComplete && (
                    <button type="button" className="pf-cancel" onClick={cancelEdit}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="pf-save" disabled={saving}>
                    {saving
                      ? <><div className="pf-spin2" /> Saving…</>
                      : <>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                          </svg>
                          Save KYC
                        </>
                    }
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

/* ── view field ── */
function VF({ label, val, span2, optional }) {
  return (
    <div className={`pf-vfield${span2 ? ' span2' : ''}`}>
      <div className="pf-vlabel">{label}</div>
      {val
        ? <div className="pf-vval">{val}</div>
        : <div className="pf-vval mt">{optional ? 'Not provided' : '—'}</div>
      }
    </div>
  )
}

/* ── edit field ── */
function EF({ label, val, set, req, span2, disabled, type, options }) {
  return (
    <div className={`pf-field${span2 ? ' span2' : ''}`}>
      <label className="pf-flabel">
        {label}{req && <em> *</em>}
      </label>
      {type === 'select' ? (
        <select
          className={`pf-finput ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
          value={val || ''}
          onChange={e => set(e.target.value)}
          required={req}
          disabled={disabled}
        >
          <option value="">Select {label}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className={`pf-finput ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
          value={val || ''}
          onChange={e => set(e.target.value)}
          required={req}
          disabled={disabled}
          placeholder={disabled ? `Verified ${label}` : `Enter ${label.toLowerCase()}…`}
        />
      )}
    </div>
  )
}
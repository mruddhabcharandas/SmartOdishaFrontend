
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

// Indian States
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Districts by State
const DISTRICTS_BY_STATE = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "Alluri Sitharama Raju", "Anakapalli", "Bapatla", "Dr. B.R. Ambedkar Konaseema", "Eluru", "Kakinada", "Nandyal", "Palnadu", "Parvathipuram Manyam", "Sri Satya Sai", "Tirupati"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Khunti", "Koriya", "Korba", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kutch", "Kheda", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapura", "Chikmagalur", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Khasi Hills", "Eastern West Khasi Hills", "North Garo Hills", "Ri-Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saitual", "Serchhip", "Siaha"],
  "Nagaland": ["Chümoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyü", "Tuensang", "Wokha", "Zünheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Debagarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Mohali", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "SAS Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur", "Beawar", "Didwana Kuchaman", "Dudu", "Gangapur", "Jaipur Rural", "Jodhpur Rural", "Kekri", "Kumher", "Malpura", "Neem Ka Thana", "Phalodi", "Sanchore", "Shahpura", "Sumerpur"],
  "Sikkim": ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Soreng"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karisalkudi", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Prayagraj", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
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
};

export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/api/user/me');
      const kyc = data.kyc || {};
      setFormData({
        fullName: kyc.fullName || data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        addressLine1: kyc.addressLine1 || '',
        addressLine2: kyc.addressLine2 || '',
        city: kyc.city || '',
        district: kyc.district || '',
        state: kyc.state || '',
        pincode: kyc.pincode || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'state') {
        return { ...prev, state: value, district: '', city: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      notify('Geolocation is not supported by your browser', 'error');
      return;
    }

    setLocLoading(true);
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`
            );
            const data = await response.json();
            
            if (data && data.address) {
              const addr = data.address;
              const newState = {
                ...formData,
                city: addr.city || addr.town || addr.village || addr.suburb || addr.district || formData.city,
                district: addr.state_district || addr.county || addr.district || formData.district,
                state: addr.state || formData.state,
                addressLine1: [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', ') ||
                  data.display_name.split(',').slice(0, 2).join(', ').trim() ||
                  formData.addressLine1,
                addressLine2: [addr.county, addr.state_district].filter(Boolean).join(', ') ||
                  data.display_name.split(',').slice(2, 4).join(', ').trim() ||
                  formData.addressLine2,
              };
              setFormData(newState);
              notify('Address details detected! Please fill your pincode manually.', 'success');
            }
          } catch (err) {
            console.error('Failed to fetch address:', err);
            notify('Failed to detect address', 'error');
          } finally {
            setLocLoading(false);
          }
        },
        () => {
          setLocLoading(false);
          notify('Location access denied. Please enable GPS.', 'error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch (err) {
      setLocLoading(false);
      notify('Failed to detect location', 'error');
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      notify('Please enter your full name', 'error');
      return false;
    }
    if (!formData.addressLine1.trim()) {
      notify('Please enter your address', 'error');
      return false;
    }
    if (!formData.district.trim()) {
      notify('Please select your district', 'error');
      return false;
    }
    if (!formData.city.trim()) {
      notify('Please enter your city', 'error');
      return false;
    }
    if (!formData.state.trim()) {
      notify('Please select your state', 'error');
      return false;
    }
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      notify('Please enter a valid 6-digit pincode', 'error');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await api.put('/api/user/kyc', formData);
      await refreshProfile();
      notify('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      notify(err?.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <LoadingSpinner text="Loading your profile..." />
    </div>
  );

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'activity', label: 'My Activity', icon: '📋' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-clip-text text-transparent">My Account</span>
          </h1>
          <p className="text-slate-600 text-lg font-semibold">
            Welcome back, {user?.name || 'User'}! Manage your account and preferences here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden sticky top-8 border border-slate-100">
              <div className="p-7 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-3xl font-bold shadow-2xl shadow-blue-900/30 border border-white/30">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xl leading-tight">{user?.name || 'User'}</p>
                    <p className="text-blue-100 text-sm font-medium mt-1 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-5">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-4 rounded-2xl mb-2 flex items-center gap-3 transition-all duration-500 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-xl shadow-blue-200 border border-blue-500'
                        : 'text-slate-700 hover:bg-gradient-to-r from-slate-50 to-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-bold text-base">{item.label}</span>
                  </button>
                ))}

                <div className="border-t border-slate-100 my-5 pt-5">
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 text-red-600 hover:bg-gradient-to-r from-red-50 to-orange-50 hover:text-red-700 transition-all duration-300 border border-transparent hover:border-red-100"
                  >
                    <span className="text-2xl">🚪</span>
                    <span className="font-bold text-base">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Personal Information */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50">
                  <div className="flex items-center justify-between flex-wrap gap-6">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                        <span className="text-4xl">👤</span> Personal Information
                      </h2>
                      <p className="text-slate-600 mt-2 text-lg font-semibold">Update your personal details here</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={locLoading}
                      className="group relative overflow-hidden flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-slate-200"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        {locLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Detecting...
                          </>
                        ) : (
                          <>
                            <span className="text-2xl">📍</span>
                            Auto Fill Address
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </button>
                  </div>
                </div>

                <div className="p-10">
                  <form onSubmit={handleSaveProfile} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          Full Name <span className="text-orange-500 text-xl">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          disabled
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl bg-slate-100 text-slate-500 cursor-not-allowed font-bold text-lg"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          disabled
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl bg-slate-100 text-slate-500 cursor-not-allowed font-bold text-lg"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          Pincode <span className="text-orange-500 text-xl">*</span>
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg"
                          placeholder="Enter 6-digit pincode"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          State <span className="text-orange-500 text-xl">*</span>
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          District <span className="text-orange-500 text-xl">*</span>
                        </label>
                        <select
                          name="district"
                          value={formData.district}
                          onChange={handleInputChange}
                          disabled={!formData.state}
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select District</option>
                          {(formData.state ? DISTRICTS_BY_STATE[formData.state] || [] : []).map((district) => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                          City <span className="text-orange-500 text-xl">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          disabled={!formData.district}
                          className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter your city"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                        Address Line 1 <span className="text-orange-500 text-xl">*</span>
                      </label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg"
                        placeholder="House number, street name, etc."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-800">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-6 py-5 border-3 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-8 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-slate-50/70 text-slate-900 font-bold text-lg"
                        placeholder="Landmark, area, etc."
                      />
                    </div>

                    <div className="pt-10 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full md:w-auto px-12 py-6 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white font-black text-xl rounded-2xl shadow-2xl shadow-orange-200 hover:shadow-orange-300 transform hover:-translate-y-3 hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                      >
                        {saving ? (
                          <span className="flex items-center gap-4">
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* My Orders */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    <span className="text-4xl">📦</span> My Orders
                  </h2>
                </div>
                <div className="p-10">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-3 hover:scale-[1.03] transition-all duration-500"
                  >
                    View All Orders →
                  </Link>
                </div>
              </div>
            )}

            {/* My Wishlist */}
            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    <span className="text-4xl">❤️</span> My Wishlist
                  </h2>
                </div>
                <div className="p-10">
                  <Link
                    to="/wishlist"
                    className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-3 hover:scale-[1.03] transition-all duration-500"
                  >
                    View My Wishlist →
                  </Link>
                </div>
              </div>
            )}

            {/* My Activity */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    <span className="text-4xl">📋</span> My Activity
                  </h2>
                </div>
                <div className="p-12 text-center">
                  <div className="text-8xl mb-6">📖</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">Your activity will appear here</h3>
                  <p className="text-slate-600 text-lg font-semibold">Keep shopping to see your browsing history!</p>
                </div>
              </div>
            )}

            {/* Account Settings */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    <span className="text-4xl">⚙️</span> Account Settings
                  </h2>
                </div>
                <div className="p-10">
                  <div className="space-y-6">
                    <div className="p-7 border-3 border-slate-100 rounded-2xl hover:border-blue-200 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100">
                      <h3 className="font-black text-2xl text-slate-900 mb-3">Password</h3>
                      <p className="text-slate-600 text-lg font-semibold mb-5">Change your password to keep your account secure</p>
                      <button className="text-blue-700 font-black text-lg hover:text-blue-800 transition-colors">
                        Change Password →
                      </button>
                    </div>
                    <div className="p-7 border-3 border-slate-100 rounded-2xl hover:border-blue-200 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100">
                      <h3 className="font-black text-2xl text-slate-900 mb-3">Notifications</h3>
                      <p className="text-slate-600 text-lg font-semibold mb-5">Manage your email and SMS notifications</p>
                      <button className="text-blue-700 font-black text-lg hover:text-blue-800 transition-colors">
                        Notification Settings →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


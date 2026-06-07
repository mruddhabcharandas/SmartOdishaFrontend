import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import Catalogue from './Catalogue'

export default function BrandPage() {
  const { slug } = useParams()
  const [brand, setBrand] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const { data } = await api.get('/api/brands')
        const found = data.find(b => b.slug === slug)
        if (found) {
          setBrand(found)
        } else {
          navigate('/products')
        }
      } catch (err) {
        navigate('/products')
      } finally {
        setLoading(false)
      }
    }
    fetchBrand()
  }, [slug, navigate])

  if (loading) return null

  // We reuse Catalogue component but pass the brand ID as a default filter
  return <Catalogue initialBrand={brand?._id} brandName={brand?.name} />
}
